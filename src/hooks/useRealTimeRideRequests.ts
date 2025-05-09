
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RideRequest } from '@/lib/types';
import { useRideRequestProcessing } from '@/hooks/useRideRequestProcessing';
import { fetchRideRequests, subscribeToRideRequests } from '@/lib/services/rideRequestService';

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
  const fetchRideRequestsCallback = useCallback(async () => {
    try {
      console.log("fetchRideRequests called with:", {
        driverId,
        coordinates,
        isEligible
      });
      
      // Basic validation checks
      if (!driverId) {
        setError("Driver ID is missing. Please sign in again.");
        setLoading(false);
        return;
      }

      if (!coordinates) {
        setError("Unable to get your location. Please enable location services.");
        setLoading(false);
        return;
      }

      if (!isEligible) {
        setError("You are not eligible to accept rides at this time.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Fetch ride requests using our service
      const processedRides = await fetchRideRequests(driverId, coordinates, maxDistance);
      setRides(processedRides);
      
    } catch (err: any) {
      console.error('Error fetching ride requests:', err);
      setError(err.message || "Could not load ride requests");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [driverId, coordinates, isEligible, maxDistance]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!isEligible || !driverId || !coordinates || !autoSubscribe) {
      return;
    }
    
    // Initial fetch
    fetchRideRequestsCallback();
    
    // Set up real-time subscription
    const channel = subscribeToRideRequests(fetchRideRequestsCallback);
    
    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [driverId, coordinates, isEligible, autoSubscribe, fetchRideRequestsCallback]);
  
  return {
    rides,
    loading,
    error,
    fetchRideRequests: fetchRideRequestsCallback,
    acceptRide,
    acceptingRide
  };
}
