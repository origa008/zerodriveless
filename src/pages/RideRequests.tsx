import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RideRequest {
  id: string;
  pickup_location: {
    name: string;
    lat: number;
    lng: number;
  };
  dropoff_location: {
    name: string;
    lat: number;
    lng: number;
  };
  bid_amount: number;
  distance_to_pickup: number;
  estimated_distance: number;
  estimated_duration: number;
  passenger: {
    name: string;
    avatar?: string;
  };
}

export default function RideRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasDriverProfile, setHasDriverProfile] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Check driver profile and wallet balance
  useEffect(() => {
    if (!user?.id) return;

    const checkDriverProfile = async () => {
      try {
        // Check if driver profile exists
        const { data: profile } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setHasDriverProfile(!!profile);

        // Get wallet balance
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        setWalletBalance(wallet?.balance || 0);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking driver profile:', error);
        setIsLoading(false);
      }
    };

    checkDriverProfile();
  }, [user?.id]);

  // Get user's location and subscribe to nearby rides
  useEffect(() => {
    if (!user?.id || !hasDriverProfile || walletBalance < 3000) return;

    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Please enable location services to receive ride requests.',
            duration: 5000
          });
        },
        { enableHighAccuracy: true }
      );
    }

    // Subscribe to real-time ride requests
    if (userLocation) {
      const channel = supabase
        .channel('nearby_rides')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rides',
            filter: `status=eq.searching`
          },
          async (payload) => {
            if (payload.eventType === 'DELETE') return;

            const newRide = payload.new;
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              newRide.pickup_lat,
              newRide.pickup_lng
            );

            // Only show rides within 5km
            if (distance <= 5) {
              const { data: passenger } = await supabase
                .from('profiles')
                .select('name, avatar')
                .eq('id', newRide.passenger_id)
                .single();

              const formattedRide = {
                ...newRide,
                distance_to_pickup: Number(distance.toFixed(1)),
                passenger
              };

              setRideRequests(prev => {
                const exists = prev.some(r => r.id === formattedRide.id);
                if (!exists) {
                  return [...prev, formattedRide];
                }
                return prev;
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, hasDriverProfile, walletBalance, userLocation]);

  const handleAcceptRide = async (rideId: string) => {
    if (!user?.id || !userLocation) return;

    try {
      const { error } = await supabase
        .from('rides')
        .update({
          driver_id: user.id,
          status: 'confirmed',
          driver_location: userLocation
        })
        .eq('id', rideId)
        .eq('status', 'searching')
        .is('driver_id', null);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ride accepted successfully!',
        duration: 3000
      });

      // Remove the accepted ride from the list
      setRideRequests(prev => prev.filter(r => r.id !== rideId));

      // Navigate to ride details
      navigate(`/rides/${rideId}`);
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept ride. Please try again.',
        duration: 3000
      });
    }
  };

  // Helper function to calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasDriverProfile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-2xl font-bold">Driver Registration Required</h2>
            <p className="mb-6 text-gray-600">
              You need to complete your driver registration before you can accept rides.
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate('/driver-registration')}
            >
              Register as Driver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (walletBalance < 3000) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-2xl font-bold">Security Deposit Required</h2>
            <p className="mb-2 text-gray-600">
              You need to maintain a minimum balance of RS 3,000 as security deposit.
            </p>
            <p className="mb-6 text-gray-600">
              Current balance: RS {walletBalance}
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate('/wallet')}
            >
              Add Money to Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Available Ride Requests</h1>
      
      {rideRequests.length === 0 ? (
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-gray-500">No ride requests available at the moment...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rideRequests.map((ride) => (
            <Card key={ride.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">RS {ride.bid_amount}</h3>
                    <span className="text-sm text-gray-500">
                      {ride.distance_to_pickup}km away
                    </span>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-start space-x-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Pickup</p>
                        <p className="text-sm text-gray-500">{ride.pickup_location.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium">Dropoff</p>
                        <p className="text-sm text-gray-500">{ride.dropoff_location.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>{ride.estimated_distance}km total</span>
                    <span>~{ride.estimated_duration} mins</span>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => handleAcceptRide(ride.id)}
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
