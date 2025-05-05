
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RideRequest, RideOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { extractCoordinates, extractLocationName } from '@/lib/utils/locationUtils';

export function useRideRequests(
  userId: string | undefined,
  coordinates: [number, number] | null,
  isEligible: boolean
) {
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to load ride requests
  const loadRideRequests = async () => {
    if (!coordinates || !userId || !isEligible) {
      console.log("Cannot load ride requests: missing coordinates, user ID, or not eligible");
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("Loading ride requests with coordinates:", coordinates);
    
    try {
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
        console.error("Error fetching rides:", error);
        throw error;
      }
      
      console.log(`Fetched ${rides?.length || 0} rides in 'searching' status`);
      
      if (!rides || rides.length === 0) {
        setRideRequests([]);
        setLoading(false);
        return;
      }

      // Process rides and add distance calculation
      const rideRequests = rides.map(ride => {
        try {
          // Extract pickup coordinates
          const pickupCoords = extractCoordinates(ride.pickup_location) || [0, 0];
          const dropoffCoords = extractCoordinates(ride.dropoff_location) || [0, 0];
          
          // Calculate distance to pickup
          const distanceToPickup = calculateDistance(
            [coordinates[0], coordinates[1]], 
            pickupCoords
          );
          
          // Create proper RideOption object
          const rideOptionData: RideOption = {
            id: '1',
            name: 'Standard',
            type: 'car',
            basePrice: ride.price || 0
          };
          
          // Parse ride_option if it exists
          if (ride.ride_option) {
            if (typeof ride.ride_option === 'string') {
              try {
                const parsed = JSON.parse(ride.ride_option);
                if (parsed) {
                  Object.assign(rideOptionData, {
                    id: parsed.id || '1',
                    name: parsed.name || 'Standard',
                    type: parsed.type || 'car',
                    basePrice: parsed.basePrice || ride.price || 0,
                  });
                }
              } catch (e) {
                console.error("Error parsing ride_option:", e);
              }
            } else if (typeof ride.ride_option === 'object' && ride.ride_option !== null) {
              const opt = ride.ride_option as any;
              Object.assign(rideOptionData, {
                id: opt.id || '1',
                name: opt.name || 'Standard',
                type: opt.type || 'car',
                basePrice: opt.basePrice || ride.price || 0,
              });
            }
          }
          
          // Create fully typed RideRequest object
          return {
            id: ride.id,
            passenger_id: ride.passenger_id,
            driver_id: ride.driver_id,
            pickup: {
              name: extractLocationName(ride.pickup_location),
              coordinates: pickupCoords as [number, number]
            },
            dropoff: {
              name: extractLocationName(ride.dropoff_location),
              coordinates: dropoffCoords as [number, number]
            },
            pickup_location: ride.pickup_location,
            dropoff_location: ride.dropoff_location,
            ride_option: rideOptionData,
            status: ride.status,
            price: ride.price,
            currency: ride.currency,
            distance: ride.distance,
            duration: ride.duration,
            start_time: ride.start_time,
            end_time: ride.end_time,
            payment_method: ride.payment_method,
            created_at: ride.created_at,
            passenger: ride.passenger,
            distance_to_pickup: Math.round(distanceToPickup * 10) / 10
          };
        } catch (err) {
          console.error("Error processing ride:", err, ride);
          return null;
        }
      }).filter(Boolean) as RideRequest[];
      
      // Filter and sort by distance
      const nearbyRides = rideRequests
        .filter(ride => ride.distance_to_pickup <= 20)
        .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);
      
      console.log(`Processed ${nearbyRides.length} nearby rides`);
      setRideRequests(nearbyRides);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      toast({
        title: "Error",
        description: "Could not load ride requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to accept a ride
  const acceptRide = async (ride: RideRequest) => {
    if (!userId || !coordinates) {
      toast({
        title: "Error",
        description: "Location or user information missing",
        variant: "destructive"
      });
      return null;
    }
    
    setAcceptingRide(ride.id);
    
    try {
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
      
      console.log("Ride is available, accepting now...");
      
      // Update ride with driver info
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          driver_id: userId,
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
      
      console.log("Ride accepted. Getting updated ride details...");
      
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
      
      console.log("Ride acceptance completed successfully");
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

  // Subscribe to real-time ride updates
  useEffect(() => {
    if (!userId || !coordinates || !isEligible) {
      console.log("Not subscribing to ride updates (not eligible or missing data)");
      return; 
    }
    
    console.log("Setting up subscription for ride updates");
    
    // Subscribe to new rides and updates
    const channel = supabase
      .channel('ride_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: "status=eq.searching"
        },
        (payload) => {
          console.log("Received real-time update:", payload);
          // Reload ride requests when changes occur
          loadRideRequests();
        }
      )
      .subscribe(status => {
        console.log("Subscription status:", status);
      });
      
    return () => {
      console.log("Removing ride updates subscription");
      supabase.removeChannel(channel);
    };
  }, [userId, coordinates, isEligible]);

  // Function to calculate distance between two points using Haversine formula
  function calculateDistance(
    point1: [number, number], 
    point2: [number, number]
  ): number {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
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
  }

  // Initial load of ride requests
  useEffect(() => {
    if (isEligible && coordinates) {
      console.log("Initial load of ride requests triggered");
      loadRideRequests();
    }
  }, [isEligible, coordinates]);

  return { 
    rideRequests, 
    loading, 
    loadRideRequests, 
    acceptRide,
    acceptingRide 
  };
}
