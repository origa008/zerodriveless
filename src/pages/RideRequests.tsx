import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/supabase';
import { calculateDistance } from '@/lib/utils/distance';
import { acceptRideRequestSafe } from '@/lib/utils/dbFunctions';
import { toast } from 'react-hot-toast';

type Ride = Database['public']['Tables']['rides']['Row'];

export default function RideRequests() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rideRequests, setRideRequests] = useState<Ride[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverProfile, setDriverProfile] = useState<Database['public']['Tables']['driver_details']['Row'] | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: driverProfile, error: driverError } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (driverError && driverError.code !== 'PGRST116') {
          throw driverError;
        }

        setDriverProfile(driverProfile);

        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) throw walletError;
        setWalletBalance(wallet?.balance || 0);

        // Get user's location
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
  }, [user]);

  useEffect(() => {
    if (!userLocation || !user) return;

    // Subscribe to nearby ride requests
    const fetchNearbyRides = async () => {
      const { data: rides, error } = await supabase
        .rpc('get_nearby_rides', {
          driver_lat: userLocation.lat,
          driver_lng: userLocation.lng,
          max_distance_km: 5
        });

      if (error) {
        console.error('Error fetching nearby rides:', error);
        return;
      }

      setRideRequests(rides || []);
    };

    fetchNearbyRides();

    const subscription = supabase
      .channel('ride_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRideRequests(current => [...current, payload.new as Ride]);
        } else if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
          setRideRequests(current => current.filter(ride => ride.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userLocation, user]);

  const handleAcceptRide = async (rideId: string) => {
    if (!user || !userLocation) return;

    try {
      const result = await acceptRideRequestSafe(rideId, user.id, {
        latitude: userLocation.lat,
        longitude: userLocation.lng
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast({
        title: "Success",
        description: "Ride accepted successfully",
      });
      
      navigate(`/ride/${rideId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept ride",
        variant: "destructive"
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

  if (!driverProfile) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Driver Registration Required</h2>
          <p className="mb-4">You need to complete your driver registration before you can accept rides.</p>
          <Button onClick={() => navigate('/driver/register')}>
            Register as Driver
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (walletBalance < 3000) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Security Deposit Required</h2>
          <p className="mb-4">Please add a minimum security deposit of ₹3000 to start accepting rides.</p>
          <Button onClick={() => navigate('/wallet')}>
            Add Funds
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Available Ride Requests</h1>
      {rideRequests.length === 0 ? (
        <p className="text-gray-500">No ride requests available at the moment.</p>
      ) : (
        <div className="grid gap-4">
          {rideRequests.map((ride) => (
            <Card key={ride.id} className="relative">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">Pickup: {ride.pickup_location}</h3>
                    <p className="text-gray-600">Dropoff: {ride.dropoff_location}</p>
                    <p className="text-sm text-gray-500">Vehicle: {ride.vehicle_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{ride.bid_amount}</p>
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
