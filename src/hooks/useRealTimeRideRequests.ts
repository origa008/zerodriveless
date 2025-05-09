
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RideRequest } from '@/lib/types';
import { extractCoordinates, extractLocationName, calculateDistance } from '@/lib/utils/locationUtils';
import { useRideRequestProcessing } from '@/hooks/useRideRequestProcessing';

type UseRealTimeRideRequestsOptions = {
  driverId: string | undefined;
  coordinates: [number, number] | null;
  isEligible: boolean;
  maxDistance?: number;
  autoSubscribe?: boolean;
};

/**
 * Hook to fetch and subscribe to real-time ride requests
 */
export function useRealTimeRideRequests({
  driverId,
  coordinates,
  isEligible,
  maxDistance = 10, // km
  autoSubscribe = true
}: UseRealTimeRideRequestsOptions) {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { acceptRide, acceptingRide } = useRideRequestProcessing(driverId);
  
  // Function to fetch current ride requests
  const fetchRideRequests = useCallback(async () => {
    if (!driverId) {
      console.log("Driver ID is undefined, cannot fetch ride requests");
      setError("Driver ID is missing. Please sign in again.");
      setLoading(false);
      return;
    }

    if (!coordinates) {
      console.log("Driver coordinates are undefined, cannot fetch ride requests");
      setError("Unable to get your location. Please enable location services.");
      setLoading(false);
      return;
    }

    if (!isEligible) {
      console.log("Driver is not eligible, cannot fetch ride requests");
      setError("You are not eligible to accept rides at this time.");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching ride requests near [${coordinates[0]}, ${coordinates[1]}]`);
      
      // Get all searching rides
      const { data: rides, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:profiles!passenger_id (
            id, name, avatar
          )
        `)
        .eq('status', 'searching')
        .is('driver_id', null);
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      if (!rides || rides.length === 0) {
        console.log("No ride requests found");
        setRides([]);
        setLoading(false);
        return;
      }
      
      console.log(`Found ${rides.length} rides in searching status`, rides);
      
      // Process and filter rides
      const nearbyRides = rides
        .map(ride => {
          try {
            // Extract coordinates from pickup_location
            const pickupCoordinates = extractCoordinates(ride.pickup_location);
            if (!pickupCoordinates) {
              console.warn(`Could not extract coordinates from pickup_location for ride ${ride.id}`, ride.pickup_location);
              return null;
            }
            
            // Calculate distance to pickup
            const distance = calculateDistance(coordinates, pickupCoordinates);
            
            // Create a default ride option if none exists
            const rideOptionData = {
              id: '1',
              name: 'Standard',
              type: 'car',
              basePrice: typeof ride.price === 'number' ? ride.price : 0
            };
            
            // Extract pickup and dropoff location names
            const pickupName = extractLocationName(ride.pickup_location, 'Pickup Location');
            const dropoffName = extractLocationName(ride.dropoff_location, 'Dropoff Location');
            
            // Extract dropoff coordinates
            const dropoffCoordinates = extractCoordinates(ride.dropoff_location) || [0, 0] as [number, number];
            
            // Create ride request object with full type safety
            const rideRequest: RideRequest = {
              id: ride.id,
              passenger_id: ride.passenger_id,
              driver_id: ride.driver_id,
              pickup: {
                name: pickupName,
                coordinates: pickupCoordinates
              },
              dropoff: {
                name: dropoffName,
                coordinates: dropoffCoordinates
              },
              pickup_location: ride.pickup_location,
              dropoff_location: ride.dropoff_location,
              ride_option: rideOptionData,
              status: 'searching',
              price: ride.price || 0,
              currency: ride.currency || 'RS',
              distance: ride.distance || 0,
              duration: ride.duration || 0,
              start_time: ride.start_time,
              end_time: ride.end_time,
              payment_method: ride.payment_method || 'cash',
              created_at: ride.created_at,
              passenger: ride.passenger,
              distance_to_pickup: parseFloat(distance.toFixed(1))
            };
            
            return rideRequest;
          } catch (err) {
            console.error('Error processing ride:', err);
            return null;
          }
        })
        .filter((ride): ride is RideRequest => 
          ride !== null && 
          ride.distance_to_pickup <= maxDistance
        )
        .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);
      
      console.log(`Found ${nearbyRides.length} rides within ${maxDistance}km`);
      setRides(nearbyRides);
    } catch (err: any) {
      console.error('Error fetching ride requests:', err);
      setError(err.message || "Could not load ride requests");
      toast({
        title: "Error",
        description: "Could not load ride requests",
        variant: "destructive"
      });
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [driverId, coordinates, isEligible, maxDistance, toast]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!isEligible || !driverId || !coordinates || !autoSubscribe) {
      return;
    }
    
    console.log("Setting up real-time subscription for rides");
    
    // Initial fetch
    fetchRideRequests();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('ride_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: "status=eq.searching"
        },
        (payload) => {
          console.log('Received real-time ride update:', payload);
          fetchRideRequests();
        }
      )
      .subscribe(status => {
        console.log('Ride requests subscription status:', status);
      });
    
    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [driverId, coordinates, isEligible, autoSubscribe, fetchRideRequests]);
  
  return {
    rides,
    loading,
    error,
    fetchRideRequests,
    acceptRide,
    acceptingRide
  };
}

export default useRealTimeRideRequests;
