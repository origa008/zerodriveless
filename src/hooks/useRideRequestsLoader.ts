
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RideRequest } from '@/lib/types';

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
        // Extract location data and other fields
        const pickupName = ride.pickup_location?.name || "Pickup Location";
        const pickupCoords = ride.pickup_location?.coordinates || [0, 0];
        const dropoffName = ride.dropoff_location?.name || "Dropoff Location";
        const dropoffCoords = ride.dropoff_location?.coordinates || [0, 0];
        
        // Create ride request object
        const rideRequest: RideRequest = {
          id: ride.id,
          passenger_id: ride.passenger_id,
          driver_id: ride.driver_id,
          pickup: {
            name: pickupName,
            coordinates: pickupCoords as [number, number]
          },
          dropoff: {
            name: dropoffName,
            coordinates: dropoffCoords as [number, number]
          },
          pickup_location: ride.pickup_location,
          dropoff_location: ride.dropoff_location,
          ride_option: {
            id: ride.ride_option?.id || '1',
            name: ride.ride_option?.name || 'Standard',
            type: ride.ride_option?.type || 'car',
            basePrice: ride.ride_option?.basePrice || ride.price || 0,
          },
          status: ride.status,
          price: ride.price || 0,
          currency: ride.currency || 'RS',
          distance: ride.distance || 0,
          duration: ride.duration || 0,
          start_time: ride.start_time,
          end_time: ride.end_time,
          payment_method: ride.payment_method || 'cash',
          created_at: ride.created_at,
          passenger: ride.passenger,
          distance_to_pickup: 0 // Will be calculated if needed
        };
        
        return rideRequest;
      });

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
