import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Clock, ArrowRight, RefreshCw, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { acceptRideRequest } from '@/lib/utils/rideUtils';
import { User } from '@/types/auth';
import { getDriverLocation } from '@/lib/utils/driverLocation';
import { DriverLocation } from '@/components/DriverLocation';

interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string | null;
  pickup_location: {
    name: string;
    coordinates: [number, number];
  };
  dropoff_location: {
    name: string;
    coordinates: [number, number];
  };
  price: number;
  distance: number;
  duration: number;
  status: string;
  created_at: string;
}

const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return distance;
};

const formatDuration = (duration: number): string => {
  const minutes = Math.floor(duration);
  const seconds = Math.floor((duration % 1) * 60);
  return `${minutes}m ${seconds}sec`;
};

const RideCard = ({ ride, onAccept }: { ride: Ride; onAccept: (ride: Ride) => void }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            ₹{ride.price}
          </h3>
          <p className="text-sm text-gray-500">
            {ride.distance.toFixed(1)}km • {formatDuration(ride.duration)}
          </p>
        </div>
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
              <MapPin className="text-white text-xs" />
            </div>
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium text-gray-900">Dropoff</p>
            <p className="text-sm text-gray-600">{ride.dropoff_location.name}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span>₹{ride.price}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{formatDuration(ride.duration)}</span>
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

export default function RideRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [rideRequests, setRideRequests] = useState<Ride[]>([]);
  const [isEligibleDriver, setIsEligibleDriver] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      
      try {
        const { data: driverData, error: driverError } = await supabase
          .from('driver_details')
          .select('status, has_sufficient_deposit')
          .eq('user_id', user.id)
          .single();

        if (driverError) {
          if (driverError.code !== 'PGRST116') {
            toast({
              title: 'Error',
              description: 'Failed to check driver status',
              variant: 'destructive',
            });
          }
          setIsEligibleDriver(false);
          return;
        }

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

  const fetchRideRequests = async () => {
    try {
      // Get driver's current location
      const driverLocation = await getDriverLocation(user.id);

      if (!driverLocation) {
        toast({
          title: 'Error',
          description: 'Please update your location to see nearby rides',
          variant: 'destructive',
        });
        return;
      }

      // Fetch nearby rides with RLS policy
      const { data: rides, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'searching')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(10); // Limit to 10 rides for performance
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch ride requests',
          variant: 'destructive',
        });
        return;
      }

      // Calculate distance from driver for each ride
      const ridesWithDistance = rides.map(ride => {
        const pickupLocation = ride.pickup_location.coordinates;
        const distance = calculateDistance(driverLocation, pickupLocation);
        return {
          ...ride,
          distance: distance
        };
      });

      setRideRequests(ridesWithDistance);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load ride requests',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isEligibleDriver) return;

    // Initialize with first fetch
    fetchRideRequests();

    // Set up Supabase subscription for real-time updates
    const subscription = supabase
      .channel('rides-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      }, async (payload) => {
        const newRide = payload.new as Ride;
        
        // Only add ride if it's not already in the list
        if (!rideRequests.some(ride => ride.id === newRide.id)) {
          // Calculate distance from driver
          const driverLocation = await getDriverLocation(user.id);
          const pickupLocation = newRide.pickup_location.coordinates;
          const distance = calculateDistance(driverLocation, pickupLocation);

          setRideRequests(prev => [{
            ...newRide,
            distance
          }, ...prev]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: 'status=neq.searching'
      }, (payload) => {
        const updatedRide = payload.new as Ride;
        setRideRequests(prev => prev.filter(ride => ride.id !== updatedRide.id));
      });
    
    subscription.subscribe();

    // Manual refresh every 30 seconds as a fallback
    const intervalId = setInterval(() => {
      fetchRideRequests();
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [isEligibleDriver, user.id]);

  const fetchNearbyRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'searching')
        .is('driver_id', null);
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch ride requests',
          variant: 'destructive',
        });
        return;
      }

      setRideRequests(data || []);
    } catch (error: any) {
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
        schema: 'public',
        table: 'rides',
        filter: 'status=neq.searching'
      }, (payload) => {
        const updatedRide = payload.new as Ride;
        setRideRequests(prev => prev.filter(ride => ride.id !== updatedRide.id));
      });
    
    subscription.subscribe();

    // Manual refresh every 30 seconds as a fallback
    const intervalId = setInterval(() => {
      fetchNearbyRides();
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [isEligibleDriver]);

  const handleAcceptRide = async (ride: Ride) => {
    try {
      setLoading(true);
      
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
      toast({
        title: 'Error',
        description: 'Failed to accept ride',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRideRequests();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isEligibleDriver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-center mb-3">Driver Registration Required</h1>
        <p className="text-gray-600 text-center mb-6">
          You need to complete your driver registration and add a security deposit to access ride requests.
        </p>
        <Button onClick={() => navigate('/official-driver')} className="w-full max-w-xs">
          Register as Driver
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold mb-4">Available Rides</h1>
        <div className="flex gap-4">
          <DriverLocation />
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
            <RideCard key={ride.id} ride={ride} onAccept={handleAcceptRide} />
          ))
        )}
      </div>
    </div>
  );
}
