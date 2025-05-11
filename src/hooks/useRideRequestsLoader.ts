
import { useState, useEffect, useCallback } from 'react';
import { RideRequest } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { fetchRideRequests, subscribeToRideRequests } from '@/lib/services/rideRequestService';
import { useRealTimeDriverLocation } from '@/hooks/useRealTimeDriverLocation';

interface UseRideRequestsLoaderProps {
  driverId?: string;
  enabled?: boolean;
  maxDistance?: number;
  autoRefreshInterval?: number; // Time in ms to auto-refresh
}

export function useRideRequestsLoader({
  driverId,
  enabled = true,
  maxDistance = 2,
  autoRefreshInterval = 30000 // Default refresh every 30 seconds
}: UseRideRequestsLoaderProps) {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get current location
  const { coordinates } = useRealTimeDriverLocation(10000); // Update every 10 seconds
  
  // Function to load ride requests
  const fetchRideRequestsHandler = useCallback(async () => {
    if (!enabled || !driverId || !coordinates) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const rideRequests = await fetchRideRequests(driverId, coordinates, maxDistance);
      setRides(rideRequests);
    } catch (err: any) {
      console.error('Error loading ride requests:', err);
      setError(err.message);
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [driverId, coordinates, enabled, maxDistance]);
  
  // Initial fetch and subscription
  useEffect(() => {
    if (!enabled || !driverId) {
      return;
    }
    
    // Fetch ride requests initially
    fetchRideRequestsHandler();
    
    // Set up real-time subscription
    const channel = subscribeToRideRequests(fetchRideRequestsHandler);
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      if (enabled && driverId && coordinates) {
        console.log('Auto-refreshing ride requests...');
        fetchRideRequestsHandler();
      }
    }, autoRefreshInterval);
    
    // Clean up subscription and interval
    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [driverId, enabled, fetchRideRequestsHandler, coordinates, autoRefreshInterval]);
  
  // Refresh when location changes
  useEffect(() => {
    if (coordinates && enabled) {
      fetchRideRequestsHandler();
    }
  }, [coordinates, enabled, fetchRideRequestsHandler]);
  
  return {
    rides,
    loading,
    error,
    refresh: fetchRideRequestsHandler
  };
}
