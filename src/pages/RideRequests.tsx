import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Car, Bike } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { calculateDistance } from '@/lib/utils/distance';

// Security deposit amount requirement for drivers
const SECURITY_DEPOSIT_REQUIREMENT = 3000;

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_location: Location;
  dropoff_location: Location;
  vehicle_type: string;
  bid_amount: number;
  estimated_distance: number;
  estimated_duration: number;
  status: string;
  created_at: string;
}

interface DriverDetails {
  id: string;
  user_id: string;
  status: string;
  vehicle_type: string;
  created_at: string;
}

export default function RideRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rideRequests, setRideRequests] = useState<Ride[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverDetails | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
          toast({
            title: 'Location Error',
            description: 'Please enable location services to view nearby rides.',
          });
        }
      );
    }
  }, []);

  // Check driver registration status and wallet balance
  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      try {
        // Check if user is registered as a driver
        const { data: driverData, error: driverError } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (driverError && driverError.code !== 'PGRST116') {
          console.error('Error fetching driver details:', driverError);
        }

        setDriverProfile(driverData || null);

        // Check wallet balance
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          console.error('Error fetching wallet:', walletError);
        } else {
          setWalletBalance(walletData?.balance || 0);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking driver status:', error);
        setLoading(false);
      }
    };

    checkDriverStatus();
  }, [user?.id]);

  // Subscribe to ride requests in real-time
  useEffect(() => {
    if (!user?.id || !driverProfile || !userLocation || walletBalance < SECURITY_DEPOSIT_REQUIREMENT) {
      return;
    }

    const fetchNearbyRides = async () => {
      try {
        // Get all rides with 'searching' status
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('status', 'searching')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          // Filter rides by proximity to driver (within 10km)
          const nearbyRides = data.filter((ride: Ride) => {
            if (!ride.pickup_location?.latitude || !ride.pickup_location?.longitude) {
              return false;
            }
            
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              ride.pickup_location.latitude,
              ride.pickup_location.longitude
            );
            
            // Only show rides that match the driver's vehicle type
            const vehicleTypeMatches = 
              !driverProfile.vehicle_type || 
              driverProfile.vehicle_type.toLowerCase() === ride.vehicle_type.toLowerCase();
              
            return distance <= 10 && vehicleTypeMatches;
          });
          
          setRideRequests(nearbyRides);
        }
      } catch (error) {
        console.error('Error fetching rides:', error);
      }
    };

    // Initial fetch
    fetchNearbyRides();

    // Set up real-time subscription for new ride requests
    const rideSubscription = supabase
      .channel('public:rides')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rides',
          filter: 'status=eq.searching'
        }, 
        (payload) => {
          // Handle real-time updates
          if (payload.eventType === 'INSERT') {
            const newRide = payload.new as Ride;
            
            // Check if ride is within range
            if (userLocation && newRide.pickup_location) {
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                newRide.pickup_location.latitude,
                newRide.pickup_location.longitude
              );
              
              // Only add nearby rides that match vehicle type
              const vehicleTypeMatches = 
                !driverProfile.vehicle_type || 
                driverProfile.vehicle_type.toLowerCase() === newRide.vehicle_type.toLowerCase();
                
              if (distance <= 10 && vehicleTypeMatches) {
                setRideRequests(prev => [newRide, ...prev]);
                
                // Notify driver of new ride request
                toast({
                  title: 'New Ride Request',
                  description: `${distance.toFixed(1)}km away - ₹${newRide.bid_amount}`,
                });
              }
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // Remove rides that are no longer searching
            setRideRequests(prev => 
              prev.filter(ride => ride.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      rideSubscription.unsubscribe();
    };
  }, [user?.id, driverProfile, userLocation, walletBalance]);

  const handleAcceptRide = async (rideId: string) => {
    if (!user?.id || !userLocation) return;

    try {
      // Update ride status to 'accepted' and set driver_id
      const { error } = await supabase
        .from('rides')
        .update({ 
          status: 'accepted',
          driver_id: user.id,
          driver_location: {
            latitude: userLocation.lat,
            longitude: userLocation.lng
          },
          accepted_at: new Date().toISOString()
        })
        .eq('id', rideId)
        .eq('status', 'searching');

      if (error) {
        if (error.code === '23505') {
          throw new Error('This ride has already been accepted by another driver.');
        }
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Ride accepted! Navigate to the pickup location.',
      });

      // Navigate to active ride page
      navigate(`/ride/${rideId}`);
    } catch (error: any) {
      console.error('Error accepting ride:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept ride. Please try again.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If not registered as a driver, show registration prompt
  if (!driverProfile) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Driver Registration Required</h2>
          <p className="mb-4">You need to complete your driver registration before you can accept rides.</p>
          <Button 
            onClick={() => navigate('/official-driver')}
            className="w-full"
          >
            Register as Driver
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If wallet balance is insufficient, prompt for deposit
  if (walletBalance < SECURITY_DEPOSIT_REQUIREMENT) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Security Deposit Required</h2>
          <p className="mb-4">
            Please add a minimum security deposit of ₹{SECURITY_DEPOSIT_REQUIREMENT} to start accepting rides.
            Your current balance: ₹{walletBalance}
          </p>
          <Button 
            onClick={() => navigate('/wallet')}
            className="w-full"
          >
            Add Funds
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Available Rides</h1>
      
      {rideRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No ride requests available at the moment.</p>
          <p className="text-sm text-gray-400">New requests will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rideRequests.map((ride) => (
            <Card key={ride.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    {ride.vehicle_type.toLowerCase() === 'bike' ? (
                      <Bike className="h-5 w-5 mr-2 text-blue-500" />
                    ) : (
                      <Car className="h-5 w-5 mr-2 text-blue-500" />
                    )}
                    <span className="font-medium capitalize">{ride.vehicle_type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{ride.bid_amount}</p>
                    {userLocation && ride.pickup_location && (
                      <p className="text-sm text-gray-500">
                        {calculateDistance(
                          userLocation.lat, 
                          userLocation.lng,
                          ride.pickup_location.latitude,
                          ride.pickup_location.longitude
                        ).toFixed(1)} km away
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Pickup</p>
                      <p className="text-xs text-gray-500">{ride.pickup_location?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-green-500 mt-1 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Dropoff</p>
                      <p className="text-xs text-gray-500">{ride.dropoff_location?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <div>Est. distance: {ride.estimated_distance.toFixed(1)} km</div>
                  <div>Est. time: {ride.estimated_duration} mins</div>
                </div>

                <Button 
                  onClick={() => handleAcceptRide(ride.id)}
                  className="w-full"
                >
                  Accept Ride
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
