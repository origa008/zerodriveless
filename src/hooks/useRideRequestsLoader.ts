
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RideRequest, JsonLocation } from '@/lib/types';
import { extractCoordinates, extractLocationName } from '@/lib/utils/locationUtils';

interface UseRideRequestsLoaderProps {
  driverId: string | undefined;
  enabled?: boolean;
  onLoaded?: (rides: RideRequest[]) => void;
}

export function useRideRequestsLoader({
  driverId,
  enabled = true,
  onLoaded
}: UseRideRequestsLoaderProps) {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to fetch available ride requests
  const fetchRideRequests = useCallback(async () => {
    if (!driverId || !enabled) {
      console.log("Fetch skipped - driver ID missing or fetch disabled");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching available ride requests for driver:", driverId);
      setLoading(true);
      setError(null);

      // Direct query to rides table for searching rides
      const { data, error } = await supabase
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
        console.error("Error fetching rides:", error);
        throw new Error(error.message);
      }

      console.log(`Found ${data?.length || 0} ride requests`, data);

      // Process rides to create properly typed RideRequest objects
      const processedRides = (data || []).map(ride => {
        try {
          // Extract location data safely
          const pickupName = extractLocationName(ride.pickup_location);
          const pickupCoords = extractCoordinates(ride.pickup_location);
          const dropoffName = extractLocationName(ride.dropoff_location);
          const dropoffCoords = extractCoordinates(ride.dropoff_location);
          
          if (!pickupCoords || !dropoffCoords) {
            console.warn("Invalid location data for ride:", ride.id);
            return null;
          }
          
          // Extract ride option data safely
          let rideOption = {
            id: '1',
            name: 'Standard',
            type: 'car',
            basePrice: typeof ride.price === 'number' ? ride.price : 0
          };
          
          if (ride.ride_option) {
            if (typeof ride.ride_option === 'string') {
              try {
                const parsed = JSON.parse(ride.ride_option);
                if (parsed) {
                  rideOption = {
                    id: parsed.id || '1',
                    name: parsed.name || 'Standard',
                    type: parsed.type || 'car',
                    basePrice: parsed.basePrice || ride.price || 0
                  };
                }
              } catch (e) {
                console.warn("Failed to parse ride_option JSON:", e);
              }
            } else if (typeof ride.ride_option === 'object' && ride.ride_option !== null) {
              const opt = ride.ride_option as any;
              rideOption = {
                id: opt.id?.toString() || '1',
                name: opt.name?.toString() || 'Standard',
                type: opt.type?.toString() || 'car',
                basePrice: typeof opt.basePrice === 'number' ? opt.basePrice : 
                          typeof ride.price === 'number' ? ride.price : 0
              };
            }
          }
          
          // Create ride request object with strict typing
          const rideRequest: RideRequest = {
            id: ride.id,
            passenger_id: ride.passenger_id,
            driver_id: ride.driver_id,
            pickup: {
              name: pickupName || "Pickup Location",
              coordinates: pickupCoords
            },
            dropoff: {
              name: dropoffName || "Dropoff Location",
              coordinates: dropoffCoords
            },
            pickup_location: ride.pickup_location,
            dropoff_location: ride.dropoff_location,
            ride_option: rideOption,
            status: ride.status as 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
            price: typeof ride.price === 'number' ? ride.price : 0,
            currency: ride.currency || 'RS',
            distance: typeof ride.distance === 'number' ? ride.distance : 0,
            duration: typeof ride.duration === 'number' ? ride.duration : 0,
            start_time: ride.start_time,
            end_time: ride.end_time,
            payment_method: ride.payment_method || 'cash',
            created_at: ride.created_at,
            passenger: ride.passenger,
            distance_to_pickup: 0 // Will be calculated if needed
          };
          
          return rideRequest;
        } catch (err) {
          console.error("Error processing ride:", err, ride);
          return null;
        }
      }).filter(Boolean) as RideRequest[];

      // Set rides and invoke callback if provided
      setRides(processedRides);
      if (onLoaded) onLoaded(processedRides);
      
    } catch (err: any) {
      console.error("Error loading ride requests:", err);
      setError(err.message || "Could not load ride requests");
      toast({
        title: "Error",
        description: err.message || "Could not load ride requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [driverId, enabled, toast, onLoaded]);

  // Set up real-time subscription
  useEffect(() => {
    if (!driverId || !enabled) return;
    
    console.log("Setting up real-time subscription for rides");
    
    // Initial fetch
    fetchRideRequests();
    
    // Set up subscription for real-time updates
    const channel = supabase
      .channel('ride-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: "status=eq.searching"
        },
        (payload) => {
          console.log("Received real-time ride update:", payload);
          fetchRideRequests();
        }
      )
      .subscribe(status => {
        console.log("Ride subscription status:", status);
      });
    
    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [driverId, enabled, fetchRideRequests]);

  // Function to manually refresh
  const refresh = useCallback(() => {
    fetchRideRequests();
  }, [fetchRideRequests]);

  return {
    rides,
    loading,
    error,
    refresh
  };
}
