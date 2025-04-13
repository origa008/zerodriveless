import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { acceptRideRequest } from '@/lib/utils/rideUtils';

// Simple distance calculation using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};

interface Ride {
  id: string;
  passenger_id: string;
  pickup_location: {
    name: string;
    address?: string;
    coordinates: number[];
  };
  dropoff_location: {
    name: string;
    address?: string;
    coordinates: number[];
  };
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  bid_amount: number;
  price: number;
  vehicle_type: string;
  status: string;
  created_at: string;
}

interface DriverProfile {
  id: string;
  user_id: string;
  status: string; // 'pending', 'approved', 'rejected'
  vehicle_type: string;
  license_plate: string;
  created_at: string;
}

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [rideRequests, setRideRequests] = useState<Ride[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [subscribed, setSubscribed] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [registrationStatus, setRegistrationStatus] = useState<string>('');

  // Check driver registration status and wallet balance
  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      try {
        // Get driver profile
        const { data: driverData, error: driverError } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (driverError) {
          if (driverError.code !== 'PGRST116') { // Not found error
            console.error("Error fetching driver profile:", driverError);
          }
          setIsRegistered(false);
        } else {
          setDriverProfile(driverData);
          setIsRegistered(true);
          setRegistrationStatus(driverData.status);
        }

        // Get wallet balance
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          if (walletError.code !== 'PGRST116') {
            console.error("Error fetching wallet:", walletError);
          }
          setWalletBalance(0);
        } else {
          setWalletBalance(walletData?.balance || 0);
        }

        // Get current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (error) => {
              toast({
                title: 'Location Error',
                description: 'Please enable location services to view nearby rides.',
                variant: 'destructive',
              });
            }
          );
        } else {
          toast({
            title: 'Location Error',
            description: 'Geolocation is not supported by your browser.',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkDriverStatus();
  }, [user?.id, toast]);

  // Subscribe to and fetch nearby ride requests in real-time
  useEffect(() => {
    // Only proceed if:
    // 1. User location is available
    // 2. User is registered (any status)
    // 3. User has sufficient deposit
    // 4. Not already subscribed
    if (!userLocation || !isRegistered || walletBalance < 3000 || subscribed) return;

    const fetchNearbyRides = async () => {
      try {
        // If user location not available, can't fetch nearby rides
        if (!userLocation) return;
        
        // Fetch nearby ride requests
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('status', 'searching')
          .eq('vehicle_type', driverProfile?.vehicle_type || 'car')
          .order('created_at', { ascending: false }) // Order by newest first
        
        if (error) throw error;
        setRideRequests(data || []);
      } catch (error: any) {
        console.error('Error fetching nearby rides:', error);
      }
    };

    // Initial fetch
    fetchNearbyRides();

    // Set up real-time subscription for ride requests
    const subscription = supabase
      .channel('ride_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `status=eq.searching AND vehicle_type=eq.${driverProfile?.vehicle_type || 'car'}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Add new ride request to the list if within range
          const newRide = payload.new as Ride;
          if (userLocation) {
            const distance = calculateDistance(
              userLocation.lat, 
              userLocation.lng, 
              newRide.pickup_lat, 
              newRide.pickup_lng
            );
            if (distance <= 10) { // 10km radius
              setRideRequests(current => [...current, newRide]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          // Remove rides that are no longer searching
          const updatedRide = payload.new as Ride;
          if (updatedRide.status !== 'searching') {
            setRideRequests(current => current.filter(ride => ride.id !== updatedRide.id));
          }
        } else if (payload.eventType === 'DELETE') {
          // Remove deleted rides
          const oldRide = payload.old as Ride;
          setRideRequests(current => current.filter(ride => ride.id !== oldRide.id));
        }
      })
      .subscribe();

    setSubscribed(true);

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
      setSubscribed(false);
    };
  }, [userLocation, isRegistered, driverProfile, walletBalance, subscribed]);

  const handleAcceptRide = async (rideId: string) => {
    if (!user?.id || !userLocation || !isRegistered) return;

    // Additional check for registration status
    if (registrationStatus !== 'approved') {
      toast({
        title: "Not Approved",
        description: "You cannot accept rides until your registration is approved.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const result = await acceptRideRequest(rideId, user.id);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to accept ride");
      }
      
      toast({
        title: "Success",
        description: "Ride accepted! Navigate to pickup location.",
      });
      
      navigate(`/ride-progress`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept ride",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show registration prompt if user is not registered as a driver
  if (!isRegistered) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Driver Registration Required</h2>
          <p className="mb-4">You need to complete your driver registration before you can accept rides.</p>
          <Button onClick={() => navigate('/official-driver')} className="w-full">
            Register as Driver
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show security deposit message if balance is insufficient
  if (walletBalance < 3000) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Security Deposit Required</h2>
          <p className="mb-4">Please add a minimum security deposit of RS 3000 to start accepting rides.</p>
          <p className="text-sm text-gray-500 mb-4">Your current balance: RS {walletBalance}</p>
          <Button onClick={() => navigate('/wallet')} className="w-full">
            Add Funds
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show pending approval message if registration status is pending
  if (registrationStatus === 'pending') {
    return (
      <Card className="m-4">
        <CardContent className="p-6 flex flex-col items-center">
          <Clock className="h-16 w-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold mb-4">Application Under Review</h2>
          <p className="mb-4 text-center">
            Your driver registration is currently being reviewed by our team. 
            You'll be able to accept rides once approved.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            While you wait, you can browse available ride requests below.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show rejection message if registration status is rejected
  if (registrationStatus === 'rejected') {
    return (
      <Card className="m-4">
        <CardContent className="p-6 flex flex-col items-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-4">Application Rejected</h2>
          <p className="mb-4 text-center">
            Unfortunately, your driver registration application was not approved. 
            Please review our driver requirements and apply again.
          </p>
          <Button onClick={() => navigate('/official-driver')} className="w-full">
            Update Application
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Available Ride Requests</h1>
      
      {rideRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No ride requests available at the moment.</p>
          <p className="text-sm text-gray-400">Requests will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rideRequests.map((ride) => (
            <Card key={ride.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Pickup: {typeof ride.pickup_location === 'object' ? ride.pickup_location.name : ride.pickup_location}
                      </h3>
                      <p className="text-gray-600">
                        Dropoff: {typeof ride.dropoff_location === 'object' ? ride.dropoff_location.name : ride.dropoff_location}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Vehicle: {ride.vehicle_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">RS {ride.bid_amount}</p>
                      <p className="text-xs text-green-600 font-medium">Bid Amount</p>
                      {userLocation && (
                        <p className="text-sm text-gray-500">
                          {calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            ride.pickup_lat,
                            ride.pickup_lng
                          ).toFixed(1)} km away
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => handleAcceptRide(ride.id)}
                  className="w-full rounded-none py-4"
                  disabled={registrationStatus !== 'approved'}
                >
                  {registrationStatus === 'approved' ? 'Accept Ride' : 'Awaiting Approval'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RideRequests;
