import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RideRequest } from '@/lib/types';
import { extractCoordinates, extractLocationName, calculateDistance } from '@/lib/utils/locationUtils';

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
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Function to fetch current ride requests
  const fetchRideRequests = useCallback(async () => {
    if (!driverId || !coordinates || !isEligible) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
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
      
      if (error) throw error;
      
      if (!rides || rides.length === 0) {
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
            
            // Process ride option data safely
            const rideOptionData = (() => {
              const defaultOption = {
                id: '1',
                name: 'Standard',
                type: 'car',
                basePrice: typeof ride.price === 'number' ? ride.price : 0
              };
              
              if (!ride.ride_option) return defaultOption;
              
              // Handle ride_option as object
              if (typeof ride.ride_option === 'object' && ride.ride_option !== null) {
                const option = ride.ride_option as Record<string, any>;
                return {
                  id: option.id || defaultOption.id,
                  name: option.name || defaultOption.name,
                  type: option.type || defaultOption.type,
                  basePrice: option.basePrice || ride.price || 0
                };
              }
              
              return defaultOption;
            })();
            
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
              status: (ride.status as 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') || 'searching',
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
    } catch (err) {
      console.error('Error fetching ride requests:', err);
      toast({
        title: "Error",
        description: "Could not load ride requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [driverId, coordinates, isEligible, maxDistance, toast]);
  
  // Function to accept a ride
  const acceptRide = async (ride: RideRequest) => {
    if (!driverId || !coordinates) {
      toast({
        title: "Error",
        description: "Location or user information missing",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      setAcceptingRide(ride.id);
      
      // Check if ride is still available
      const { data: rideCheck, error: checkError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', ride.id)
        .eq('status', 'searching')
        .is('driver_id', null)
        .single();
        
      if (checkError || !rideCheck) {
        throw new Error("This ride is no longer available");
      }
      
      // Update ride with driver info
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          driver_id: driverId,
          status: 'confirmed',
          start_time: new Date().toISOString(),
          driver_location: {
            type: 'Point',
            coordinates: coordinates,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', ride.id);
        
      if (updateError) throw updateError;
      
      // Get updated ride details with passenger info
      const { data: acceptedRide, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:profiles!passenger_id (
            id, name, avatar, phone
          )
        `)
        .eq('id', ride.id)
        .single();
        
      if (error || !acceptedRide) {
        throw new Error("Could not retrieve updated ride information");
      }
      
      toast({
        title: "Success",
        description: "You have accepted the ride",
      });
      
      // Refresh ride list
      fetchRideRequests();
      
      return acceptedRide;
    } catch (err: any) {
      console.error("Error accepting ride:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept ride",
        variant: "destructive"
      });
      return null;
    } finally {
      setAcceptingRide(null);
    }
  };
  
  // Set up real-time subscription
  useEffect(() => {
    if (!isEligible || !driverId || !coordinates || !autoSubscribe) {
      return;
    }
    
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
      supabase.removeChannel(channel);
    };
  }, [driverId, coordinates, isEligible, autoSubscribe, fetchRideRequests]);
  
  return {
    rides,
    loading,
    fetchRideRequests,
    acceptRide,
    acceptingRide
  };
}

export default useRealTimeRideRequests;
