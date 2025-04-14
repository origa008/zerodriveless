import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Clock, ArrowRight, MapPin, Flag, RefreshCw, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { acceptRideRequest } from '@/lib/utils/rideUtils';
import DriverModeToggle from '@/components/ride/DriverModeToggle';

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
  passenger_email?: string;
  driver_id?: string;
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
  ride_option: {
    name: string;
    type: string;
    basePrice: number;
  };
  bid_amount: number;
  ride_column: number; // Using ride_column instead of price
  distance: number;
  duration: number;
  status: string;
  created_at: string;
  payment_method: string;
  currency?: string;
}

interface DriverProfile {
  id: string;
  user_id: string;
  status: string; // 'pending', 'approved', 'rejected'
  vehicle_type: string;
  license_plate: string;
  created_at: string;
}

// Component to display a single ride request card
const RideCard = ({ ride, onAccept }: { ride: Ride; onAccept: (ride: Ride) => void }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 border border-gray-200">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {formatCurrency(ride.bid_amount)}
            </h3>
            <p className="text-sm text-gray-500">
              {ride.distance.toFixed(1)}km • {formatDuration(ride.duration)}
            </p>
          </div>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {ride.ride_option?.name || 'Vehicle'}
          </span>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 flex justify-center">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <MapPin className="text-white text-xs" />
              </div>
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-900">Pickup</p>
              <p className="text-sm text-gray-600">{ride.pickup_location.name}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 flex justify-center">
              <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
                <Flag className="text-white text-xs" />
              </div>
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-900">Dropoff</p>
              <p className="text-sm text-gray-600">{ride.dropoff_location.name}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <button
            onClick={() => onAccept(ride)}
            className="w-full bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition duration-200"
          >
            Accept Ride
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format duration in minutes
const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
};

// New component for more simplified display matching the image
const SimpleRideCard = ({ ride }: { ride: any }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAccept = async () => {
    try {
      const result = await acceptRideRequest(ride.id, user.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Ride accepted successfully!',
        });
        navigate(`/rides/${ride.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to accept ride',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept ride',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm mb-4">
      <h2 className="text-2xl font-bold mb-6">Ride Request</h2>
      <div className="flex items-start mb-3">
        <div className="w-8 mr-2 flex-shrink-0">
          <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
            <MapPin className="h-4 w-4 text-gray-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg text-gray-500">{ride.pickup_location?.name || 'Pickup location'}</h3>
        </div>
        <div className="text-right">
          <div className="text-gray-500">Distance</div>
          <div className="text-xl font-bold">{parseFloat(ride.distance).toFixed(1)} km</div>
        </div>
      </div>
      
      <div className="flex items-start mb-6">
        <div className="w-8 mr-2 flex-shrink-0">
          <div className="h-6 w-6 bg-gray-800 rounded-full flex items-center justify-center">
            <Flag className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium">{ride.dropoff_location?.name || 'Dropoff location'}</h3>
        </div>
        <div className="text-right">
          <div className="text-gray-500">Price</div>
          <div className="text-xl font-bold">{ride.bid_amount || ride.ride_column || 0} RS</div>
        </div>
      </div>
      
      <Button 
        onClick={handleAccept}
        className="w-full bg-black text-white py-6 rounded-xl text-xl"
      >
        Accept
      </Button>
    </div>
  );
};

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDriverMode, setDriverMode } = useRide();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rideRequests, setRideRequests] = useState<Ride[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [registrationStatus, setRegistrationStatus] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Check driver registration status and wallet balance
  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      
      try {
        // First check if user has submitted driver registration
        const { data: driverDetails, error: driverError } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (driverError) {
          if (driverError.code !== 'PGRST116') { // Not found error
            console.error("Error fetching driver details:", driverError);
          }
          setIsRegistered(false);
          setRegistrationStatus('');
        } else {
          setIsRegistered(true);
          setRegistrationStatus(driverDetails.status);
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

  // Function to fetch nearby ride requests - completely rewritten for reliability
  const fetchNearbyRides = async () => {
    try {
      setRefreshing(true);
      
      // Simpler query - just get ALL rides with 'searching' status
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'searching')
        .is('driver_id', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching ride requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch ride requests',
          variant: 'destructive',
        });
        return;
      }

      console.log('All fetched rides:', data);
      
      // Debug logging - show exactly what's coming from the database
      if (data && data.length > 0) {
        console.log('First ride details:', {
          id: data[0].id,
          pickup: data[0].pickup_location,
          dropoff: data[0].dropoff_location,
          status: data[0].status,
          bid: data[0].bid_amount,
          ride_column: data[0].ride_column,
          distance: data[0].distance,
          duration: data[0].duration
        });
      } else {
        console.log('No rides found with searching status');
      }
      
      // Set all rides without filtering for distance yet
      setRideRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching nearby rides:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load ride requests',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchNearbyRides();
  };

  // Subscribe to and fetch nearby ride requests in real-time
  useEffect(() => {
    // Only proceed if:
    // 1. User location is available
    // 2. User is registered 
    // 3. Registration status is approved
    // 4. User has sufficient deposit
    if (!userLocation || !isRegistered || registrationStatus !== 'approved' || walletBalance < 3000) return;

    // Initial fetch
    fetchNearbyRides();

    // Set up real-time subscription for ride requests
    const subscription = supabase
      .channel('ride_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `status=eq.searching`
      }, (payload) => {
        console.log('Received real-time update:', payload);
        
        if (payload.eventType === 'INSERT') {
          // Add new ride request to the list if within range
          const newRide = payload.new as Ride;
          if (userLocation && newRide.pickup_location?.coordinates) {
            const pickupLng = newRide.pickup_location.coordinates[0];
            const pickupLat = newRide.pickup_location.coordinates[1];
            
            const distance = calculateDistance(
              userLocation.lat, 
              userLocation.lng, 
              pickupLat, 
              pickupLng
            );
            
            console.log(`New ride ${newRide.id} distance: ${distance.toFixed(1)}km`);
            
            if (distance <= 10) { // 10km radius
              toast({
                title: 'New Ride Request',
                description: 'A new ride request is available nearby.',
                duration: 5000,
              });
              setRideRequests(current => [newRide, ...current]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          // Remove rides that are no longer searching or have been accepted
          const updatedRide = payload.new as Ride;
          if (updatedRide.status !== 'searching' || updatedRide.driver_id) {
            setRideRequests(current => current.filter(ride => ride.id !== updatedRide.id));
          }
        } else if (payload.eventType === 'DELETE') {
          // Remove deleted rides
          const oldRide = payload.old as Ride;
          setRideRequests(current => current.filter(ride => ride.id !== oldRide.id));
        }
      })
      .subscribe();

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [userLocation, isRegistered, registrationStatus, walletBalance]);

  // Function to handle accepting a ride request
  const handleAcceptRide = async (ride: Ride) => {
    try {
      setLoading(true);
      
      // Check if user profile data is available
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to accept rides',
          variant: 'destructive',
        });
        return;
      }
      
      // Call the acceptRideRequest utility function
      const result = await acceptRideRequest(ride.id, user.id);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Ride accepted successfully!',
        });
        navigate(`/rides/${ride.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to accept ride',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept ride',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Ensure driver mode is set when this component is loaded
  useEffect(() => {
    if (!isDriverMode) {
      setDriverMode(true);
      console.log('Setting driver mode to true');
    }
  }, [isDriverMode, setDriverMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Loading...</p>
      </div>
    );
  }

  // Not registered, direct to OfficialDriver page
  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-center mb-3">Driver Registration Required</h1>
        <p className="text-gray-600 text-center mb-6">
          You need to complete your driver registration before you can access ride requests.
        </p>
        <Button onClick={() => navigate('/official-driver')} className="w-full max-w-xs">
          Register as Driver
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Application pending
  if (registrationStatus === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <Clock className="h-16 w-16 text-amber-500 mb-6" />
        <h1 className="text-2xl font-bold text-center mb-3">Application Under Review</h1>
        <p className="text-gray-600 text-center mb-6">
          Your driver registration is currently being reviewed by our team. 
          This typically takes 1-2 business days.
        </p>
        <Button onClick={() => navigate('/')} variant="outline" className="w-full max-w-xs">
          Return to Home
        </Button>
      </div>
    );
  }

  // Application rejected
  if (registrationStatus === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-center mb-3">Application Rejected</h1>
        <p className="text-gray-600 text-center mb-6">
          Unfortunately, your driver registration application was not approved. 
          Please contact our support team for more information.
        </p>
        <Button onClick={() => navigate('/official-driver')} className="w-full max-w-xs">
          Update Application
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Show security deposit message if balance is insufficient
  if (walletBalance < 3000) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-6" />
        <h1 className="text-2xl font-bold text-center mb-3">Security Deposit Required</h1>
        <p className="text-gray-600 text-center mb-3">
          Please add a minimum security deposit of RS 3000 to start accepting rides.
        </p>
        <p className="text-sm text-gray-500 mb-6">Your current balance: RS {walletBalance}</p>
        <Button onClick={() => navigate('/wallet')} className="w-full max-w-xs">
          Add Funds
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Main ride request list UI for approved drivers
  if (isRegistered && registrationStatus === 'approved' && walletBalance >= 3000 && !loading) {
    return (
      <div className="min-h-screen bg-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Ride Requests</h1>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full h-10 w-10"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {refreshing && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="animate-spin h-6 w-6 mr-2" />
            <p className="text-gray-500">Refreshing rides...</p>
          </div>
        )}
        
        <div className="space-y-4">
          {rideRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <div className="bg-gray-100 rounded-full p-4 mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2 font-medium">No ride requests available</p>
              <p className="text-sm text-gray-400 mb-6">New requests will appear here automatically</p>
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          ) : (
            rideRequests.map((ride) => (
              <SimpleRideCard key={ride.id} ride={ride} />
            ))
          )}
        </div>
        
        <div className="fixed bottom-6 left-0 right-0 flex justify-center">
          <div className="bg-white shadow-lg rounded-full px-4 py-2 border border-gray-200">
            <DriverModeToggle />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <h1 className="text-3xl font-bold mb-6">Ride Request</h1>
      
      <div className="divide-y">
        {rideRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-400 mb-2">No ride requests available</p>
            <p className="text-sm text-gray-400">New requests will appear here automatically</p>
          </div>
        ) : (
          rideRequests.map((ride) => (
            <RideCard key={ride.id} ride={ride} onAccept={handleAcceptRide} />
          ))
        )}
      </div>
    </div>
  );
};

export default RideRequests;
