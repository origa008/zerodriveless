import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Clock, ArrowRight, MapPin, Flag, RefreshCw, DollarSign, BugPlay } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { acceptRideRequest } from '@/lib/utils/rideUtils';
import { createTestRide } from '@/lib/utils/dbFunctions';
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
  driver_id?: string | null;
  pickup_location: {
    name: string;
    address?: string;
    coordinates: number[]; // [lng, lat]
  };
  dropoff_location: {
    name: string;
    address?: string;
    coordinates: number[]; // [lng, lat]
  };
  ride_option: {
    name: string;
    type: string;
    basePrice: number;
  };
  bid_amount?: number;
  price?: number;
  distance: number;
  duration: number;
  status: string; // 'searching', 'confirmed', 'in_progress', 'completed', 'cancelled'
  created_at: string;
  payment_method: string;
  currency?: string;
  start_time?: string | null;
  end_time?: string | null;
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
              {formatCurrency(ride.bid_amount || ride.price || 0)}
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
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      // Log the ride being accepted for debugging
      console.log('Accepting ride:', ride);
      
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

  // Format time ago (e.g. "2 min ago")
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return new Date(dateString).toLocaleDateString();
  };

  // Get the ride price (check both price and bid_amount fields)
  const getRidePrice = () => {
    // First try bid_amount, then price, then default to 0
    return ride.bid_amount || ride.price || 0;
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md mb-4 border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-bold">Ride Request</h2>
        {ride.created_at && (
          <span className="text-sm text-gray-500">{formatTimeAgo(ride.created_at)}</span>
        )}
      </div>
      
      {/* Pickup location with map pin icon */}
      <div className="flex items-start mb-4">
        <div className="w-10 mr-2 flex-shrink-0">
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <MapPin className="h-4 w-4 text-green-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
          <h3 className="text-lg font-medium">
            {ride.pickup_location?.name || 'No pickup location specified'}
          </h3>
          {ride.pickup_location?.address && (
            <p className="text-sm text-gray-500">{ride.pickup_location.address}</p>
          )}
        </div>
      </div>
      
      {/* Dropoff location with flag icon */}
      <div className="flex items-start mb-6">
        <div className="w-10 mr-2 flex-shrink-0">
          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
            <Flag className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Dropoff Location</p>
          <h3 className="text-lg font-medium">
            {ride.dropoff_location?.name || 'No dropoff location specified'}
          </h3>
          {ride.dropoff_location?.address && (
            <p className="text-sm text-gray-500">{ride.dropoff_location.address}</p>
          )}
        </div>
      </div>
      
      {/* Ride details in a grid */}
      <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">Distance</p>
          <p className="text-xl font-bold">{parseFloat(ride.distance || '0').toFixed(1)} km</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Duration</p>
          <p className="text-xl font-bold">{ride.duration ? Math.round(ride.duration / 60) : 0} min</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Price</p>
          <p className="text-xl font-bold text-green-600">
            {getRidePrice()} RS
          </p>
        </div>
      </div>
      
      {/* Vehicle type if available */}
      {ride.ride_option?.name && (
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {ride.ride_option.name}
          </span>
        </div>
      )}
      
      <Button 
        onClick={handleAccept}
        className="w-full bg-black text-white py-6 rounded-xl text-xl font-medium"
      >
        Accept Ride
      </Button>
    </div>
  );
};

// Add a direct database test function to bypass RideContext
const createDirectTestRide = async () => {
  if (!user?.id) return;

  try {
    toast({
      title: 'Creating direct test ride',
      description: 'Inserting directly into database...'
    });

    // Generate a unique ID for the test ride
    const now = new Date();
    const testId = `test-${now.getTime()}`;

    // Format user-friendly coords for logging
    const startLat = 33.5678;
    const startLng = 73.1234;
    const endLat = 33.6789;
    const endLng = 73.2345;

    console.log(`Creating direct test ride with ID ${testId}`);
    console.log(`From [${startLat}, ${startLng}] to [${endLat}, ${endLng}]`);

    // Create a test ride directly in the database
    const { data, error } = await supabase
      .from('rides')
      .insert({
        id: testId, // Set explicit ID for easier tracking
        passenger_id: user.id,
        pickup_location: {
          name: "Direct Test Pickup",
          address: "123 Direct Test St",
          coordinates: [startLng, startLat] // [lng, lat] format
        },
        dropoff_location: {
          name: "Direct Test Dropoff",
          address: "456 Direct Test Ave",
          coordinates: [endLng, endLat] // [lng, lat] format
        },
        ride_option: {
          name: "Car",
          type: "Car",
          basePrice: 300
        },
        bid_amount: 300,
        price: 300,
        distance: 7.5,
        duration: 1200, // 20 minutes in seconds
        status: "searching",
        payment_method: "cash",
        created_at: now.toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating direct test ride:', error);
      throw error;
    }

    console.log('Direct test ride created successfully:', data);
    
    // Immediately check if the ride appears in our list
    toast({
      title: 'Success',
      description: 'Direct test ride created. Refreshing...'
    });

    // Wait 1 second then refresh to see if ride appears
    setTimeout(() => {
      fetchNearbyRides();
      
      // Also verify the ride exists after creation
      setTimeout(async () => {
        const { data: verification } = await supabase
          .from('rides')
          .select('*')
          .eq('id', testId);
          
        console.log('Verification query results:', verification);
      }, 2000);
    }, 1000);

    return data;
  } catch (error: any) {
    console.error('Error in direct test:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to create direct test ride',
      variant: 'destructive'
    });
    return null;
  }
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
      console.log('Fetching nearby rides...');
      
      // Debug: Log user location
      console.log('Current driver location:', userLocation);
      
      // Get all searching rides
      const { data: allRides, error } = await supabase
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

      // Filter rides based on distance if location is available
      const filteredRides = userLocation ? allRides?.filter(ride => {
        if (!ride.pickup_location?.coordinates) return false;
        
        // Calculate distance from driver to pickup location
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          ride.pickup_location.coordinates[1],
          ride.pickup_location.coordinates[0]
        );
        
        // Only show rides within 20km
        return distance <= 20;
      }) : allRides;

      // Debug detailed information about the results
      console.log(`Fetched ${allRides?.length || 0} total rides, ${filteredRides?.length || 0} within range`);
      console.log('Filtered rides:', filteredRides);
      
      setRideRequests(filteredRides || []);
      
      if (error) {
        console.error('Error fetching ride requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch ride requests',
          variant: 'destructive',
        });
        return;
      }

      // Debug detailed information about the results
      console.log(`Fetched ${data?.length || 0} available rides`);
      console.log('SQL query returned rides:', data);
      
      // Debug logging - show exactly what's coming from the database
      if (data && data.length > 0) {
        data.forEach((ride, index) => {
          console.log(`Ride ${index + 1} details:`, {
            id: ride.id,
            pickup: ride.pickup_location,
            dropoff: ride.dropoff_location,
            status: ride.status,
            bid: ride.bid_amount,
            price: ride.price,
            distance: ride.distance,
            duration: ride.duration,
            created_at: ride.created_at
          });
        });
      } else {
        console.log('No rides found with searching status');
        
        // Debug: Check if there are any rides at all, regardless of status
        const { data: allRides, error: allRidesError } = await supabase
          .from('rides')
          .select('id, status, driver_id')
          .limit(10);
          
        if (!allRidesError && allRides) {
          console.log('Most recent rides in database:', allRides);
        }
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
    // Check prerequisites for ride requests
    if (!userLocation) {
      toast({
        title: 'Location Required',
        description: 'Please enable location services to view nearby rides.',
        variant: 'destructive',
      });
      return;
    }

    if (!isRegistered) {
      toast({
        title: 'Registration Required',
        description: 'You need to complete driver registration to view ride requests.',
        variant: 'destructive',
      });
      return;
    }

    if (registrationStatus !== 'approved') {
      toast({
        title: 'Approval Required',
        description: 'Your driver registration must be approved to view ride requests.',
        variant: 'destructive',
      });
      return;
    }

    if (walletBalance < 3000) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please add ₹3000 to your wallet to view ride requests.',
        variant: 'destructive',
      });
      return;
    }

    // Initial fetch
    fetchNearbyRides();
    console.log('Setting up real-time subscription for new ride requests...');

    // Set up real-time subscription for ride requests
    const subscription = supabase
      .channel('rides-channel') // Use a simpler channel name
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      }, (payload) => {
        console.log('New ride created:', payload);
        const newRide = payload.new as Ride;
        
        // Add to our rides list automatically
        setRideRequests(prev => [newRide, ...prev]);
        
        // Show notification
        toast({
          title: 'New Ride Request',
          description: `From ${newRide.pickup_location?.name || 'pickup'} to ${newRide.dropoff_location?.name || 'destination'}`,
          duration: 5000,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      }, (payload) => {
        console.log('Ride updated:', payload);
        const updatedRide = payload.new as Ride;
        
        // Handle updates to rides (like price changes)
        if (updatedRide.driver_id) {
          // Ride was taken by another driver, remove it
          setRideRequests(prev => prev.filter(ride => ride.id !== updatedRide.id));
        } else {
          // Update the ride in our list
          setRideRequests(prev => prev.map(ride => 
            ride.id === updatedRide.id ? updatedRide : ride
          ));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: 'status=neq.searching'
      }, (payload) => {
        // Remove rides that are no longer in searching status
        const updatedRide = payload.new as Ride;
        setRideRequests(prev => prev.filter(ride => ride.id !== updatedRide.id));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'rides'
      }, (payload) => {
        // Remove deleted rides
        const oldRide = payload.old as Ride;
        setRideRequests(prev => prev.filter(ride => ride.id !== oldRide.id));
      });
    
    // Set up subscription with retry mechanism
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    const subscribeWithRetry = async () => {
      try {
        const subscriptionResult = await subscription.subscribe();
        
        subscriptionResult.on('SUBSCRIBED', () => {
          console.log('Successfully subscribed to ride changes');
          retryCount = 0;
        });

        subscriptionResult.on('CHANNEL_ERROR', (error) => {
          console.error('Subscription error:', error);
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(subscribeWithRetry, retryDelay);
          } else {
            console.error('Max retries reached for subscription');
            toast({
              title: 'Error',
              description: 'Failed to connect to real-time updates. Please refresh the page.',
              variant: 'destructive',
            });
          }
        });

        subscriptionResult.on('CLOSED', () => {
          console.error('Subscription closed');
          if (retryCount < maxRetries) {
            setTimeout(subscribeWithRetry, retryDelay);
          }
        });

      } catch (error) {
        console.error('Error setting up subscription:', error);
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(subscribeWithRetry, retryDelay);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to connect to real-time updates. Please refresh the page.',
            variant: 'destructive',
          });
        }
      }
    };

    subscribeWithRetry();

    // Manual refresh every 10 seconds as a fallback
    const intervalId = setInterval(() => {
      console.log('Performing periodic refresh of ride requests');
      fetchNearbyRides();
    }, 10000);

    console.log('Subscribed to ride changes');

    // Clean up subscription
    return () => {
      console.log('Unsubscribing from ride changes');
      subscription.unsubscribe();
      clearInterval(intervalId);
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
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                
                {/* Development mode only: test button */}
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    onClick={async () => {
                      if (!user?.id) return;
                      try {
                        toast({
                          title: 'Creating test ride',
                          description: 'Please wait...'
                        });
                        const result = await createTestRide(user.id);
                        if (result.success) {
                          toast({
                            title: 'Test ride created',
                            description: 'A test ride has been created and should appear shortly.'
                          });
                          // Fetch rides immediately
                          fetchNearbyRides();
                        } else {
                          toast({
                            title: 'Error',
                            description: result.error || 'Failed to create test ride',
                            variant: 'destructive'
                          });
                        }
                      } catch (error: any) {
                        toast({
                          title: 'Error',
                          description: error.message || 'Failed to create test ride',
                          variant: 'destructive'
                        });
                      }
                    }}
                    variant="secondary" 
                    className="gap-2"
                  >
                    <BugPlay className="h-4 w-4" />
                    Create Test Ride
                  </Button>
                )}

                {/* Add this after the Create Test Ride button */}
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    onClick={() => {
                      const debugInfo = {
                        userLocation,
                        isRegistered,
                        registrationStatus,
                        walletBalance,
                        isDriverMode,
                        rideRequestsCount: rideRequests.length
                      };
                      console.log('Debug info:', debugInfo);
                      toast({
                        title: 'Debug Info',
                        description: `Location: ${userLocation ? '✓' : '✗'}, 
                                      Registered: ${isRegistered ? '✓' : '✗'}, 
                                      Status: ${registrationStatus || 'none'}, 
                                      Balance: ${walletBalance}, 
                                      Driver Mode: ${isDriverMode ? '✓' : '✗'}, 
                                      Rides: ${rideRequests.length}`,
                        duration: 5000
                      });
                    }}
                    variant="outline" 
                    className="gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Show Debug Info
                  </Button>
                )}

                {/* Add this after the Debug Info button */}
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    onClick={createDirectTestRide}
                    variant="destructive" 
                    className="gap-2"
                  >
                    <BugPlay className="h-4 w-4" />
                    Direct Database Test
                  </Button>
                )}
              </div>
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
