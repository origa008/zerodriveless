import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Clock, ArrowRight, MapPin, Flag, RefreshCw, DollarSign, BugPlay } from 'lucide-react';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { acceptRideRequest } from '@/lib/utils/rideUtils';
import { User } from '@/types/auth';

interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string | null;
  pickup_location: {
    name: string;
    coordinates: number[];
  };
  dropoff_location: {
    name: string;
    coordinates: number[];
  };
  ride_option: {
    name: string;
    basePrice: number;
  };
  bid_amount?: number;
  price?: number;
  distance: number;
  duration: number;
  status: string;
  created_at: string;
}

const RideCard = ({ ride, onAccept }: { ride: Ride; onAccept: (ride: Ride) => void }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {formatCurrency(ride.bid_amount || ride.price || 0)}
          </h3>
          <p className="text-sm text-gray-500">
            {ride.distance.toFixed(1)}km • {formatDuration(ride.duration)}
          </p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
          {ride.ride_option?.name}
        </span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 flex justify-center">
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
              <Clock className="text-white text-xs" />
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
              <Clock className="text-white text-xs" />
            </div>
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium text-gray-900">Dropoff</p>
            <p className="text-sm text-gray-600">{ride.dropoff_location.name}</p>
          </div>
        </div>
      </div>

      <Button
        onClick={() => onAccept(ride)}
        className="w-full"
      >
        Accept Ride
        <ArrowRight className="ml-2 h-5 w-5" />
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
  const [isEligibleDriver, setIsEligibleDriver] = useState(false);
  const [driverStatus, setDriverStatus] = useState<string>('');
  const [hasDeposit, setHasDeposit] = useState(false);

  // Check driver eligibility
  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      
      try {
        // Check driver status
        const { data: driverData, error: driverError } = await supabase
          .from('driver_details')
          .select('status, has_sufficient_deposit')
          .eq('user_id', user.id)
          .single();

        if (driverError) {
          if (driverError.code !== 'PGRST116') { // Not found error
            console.error("Error fetching driver details:", driverError);
            toast({
              title: 'Error',
              description: 'Failed to check driver status',
              variant: 'destructive',
            });
          }
          setDriverStatus('');
          setHasDeposit(false);
          setIsEligibleDriver(false);
          return;
        }

        setDriverStatus(driverData.status);
        setHasDeposit(driverData.has_sufficient_deposit);
        setIsEligibleDriver(driverData.status === 'approved' && driverData.has_sufficient_deposit);
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

  const fetchNearbyRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'searching')
        .is('driver_id', null);
      
      if (error) {
        console.error('Error fetching ride requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch ride requests',
          variant: 'destructive',
        });
        return;
      }

      setRideRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching nearby rides:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load ride requests',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isEligibleDriver) return;

    fetchNearbyRides();

    const subscription = supabase
      .channel('rides-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      }, (payload) => {
        const newRide = payload.new as Ride;
        setRideRequests(prev => [newRide, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
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
    
    // Try to subscribe and catch any errors
    subscription.subscribe((status) => {
      console.log(`Supabase subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to ride changes');
      } else if (status === 'CLOSED') {
        console.error('Subscription closed');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error with subscription channel');
      }
    });

    // Manual refresh every 30 seconds as a fallback
    const intervalId = setInterval(() => {
      console.log('Performing periodic refresh of ride requests');
      fetchNearbyRides();
    }, 30000);

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
        

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ride Request</h1>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => navigate('/')}
        >
          <User className="h-4 w-4" />
          Switch to Passenger
        </Button>
      </div>
      
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
