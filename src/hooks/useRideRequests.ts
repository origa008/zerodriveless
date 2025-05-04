
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RideRequest, RideOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { extractCoordinates, extractLocationName, calculateDistance } from '@/lib/utils/locationUtils';

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
      // Get driver details to check vehicle type
      const { data: driverDetails } = await supabase
        .from('driver_details')
        .select('vehicle_type')
        .eq('user_id', userId)
        .single();
        
      if (!driverDetails) {
        console.log("Driver details not found");
        throw new Error("Driver details not found");
      }
      
      console.log("Driver vehicle type:", driverDetails.vehicle_type);
      
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

      // Filter rides by proximity and vehicle type
      const nearbyRides = rides
        .filter(ride => {
          // Extract vehicle type from ride option
          let rideVehicleType = "";
          if (ride.ride_option) {
            if (typeof ride.ride_option === 'string') {
              try {
                const parsed = JSON.parse(ride.ride_option);
                rideVehicleType = parsed?.type?.toLowerCase() || "";
              } catch (e) {
                console.error("Error parsing ride option:", e);
              }
            } else if (ride.ride_option && typeof ride.ride_option === 'object') {
              // Handle as object with proper type check
              if (!Array.isArray(ride.ride_option) && 'type' in ride.ride_option) {
                const typeValue = ride.ride_option.type;
                rideVehicleType = typeof typeValue === 'string' ? typeValue.toLowerCase() : "";
              }
            }
          }
          
          // Skip vehicle type check if rideVehicleType is empty
          const vehicleMatches = !rideVehicleType || 
            rideVehicleType === driverDetails.vehicle_type.toLowerCase();
          
          if (!vehicleMatches) return false;

          // Extract coordinates
          const pickupCoords = extractCoordinates(ride.pickup_location);
          if (!pickupCoords) return false;
          
          const [pickupLng, pickupLat] = pickupCoords;
          
          // Calculate distance to pickup
          const distance = calculateDistance(
            [coordinates[0], coordinates[1]], // [longitude, latitude]
            [pickupLng, pickupLat]
          );
          
          // Only include rides within 10km
          return distance <= 10;
        })
        .map(ride => {
          // Extract coordinates
          const pickupCoords = extractCoordinates(ride.pickup_location);
          const [pickupLng, pickupLat] = pickupCoords || [0, 0];
          
          const dropoffCoords = extractCoordinates(ride.dropoff_location);
          
          // Calculate distance to pickup
          const distanceToPickup = calculateDistance(
            [coordinates[0], coordinates[1]], // [longitude, latitude] 
            [pickupLng, pickupLat]
          );
          
          // Create a properly typed RideOption
          let rideOptionData: RideOption = {
            id: '1',
            name: 'Standard',
            type: 'car',
            basePrice: ride.price || 0
          };
          
          // Try to parse ride_option if it exists
          if (ride.ride_option) {
            if (typeof ride.ride_option === 'string') {
              try {
                const parsed = JSON.parse(ride.ride_option);
                if (parsed) {
                  rideOptionData = {
                    id: parsed.id || '1',
                    name: parsed.name || 'Standard',
                    type: parsed.type || 'car',
                    basePrice: parsed.basePrice || ride.price || 0,
                    // Add optional fields if they exist
                    price: parsed.price,
                    currency: parsed.currency,
                    description: parsed.description,
                    capacity: parsed.capacity,
                    duration: parsed.duration,
                    eta: parsed.eta,
                    image: parsed.image
                  };
                }
              } catch (e) {
                console.error("Error parsing ride_option:", e);
              }
            } else if (typeof ride.ride_option === 'object' && ride.ride_option !== null) {
              const opt = ride.ride_option as any;
              rideOptionData = {
                id: opt.id || '1',
                name: opt.name || 'Standard',
                type: opt.type || 'car',
                basePrice: opt.basePrice || ride.price || 0,
                // Add optional fields if they exist
                price: opt.price,
                currency: opt.currency,
                description: opt.description,
                capacity: opt.capacity,
                duration: opt.duration,
                eta: opt.eta,
                image: opt.image
              };
            }
          }
          
          // Convert to RideRequest type with proper typing
          const rideRequest: RideRequest = {
            id: ride.id,
            passenger_id: ride.passenger_id,
            driver_id: ride.driver_id,
            pickup: {
              name: extractLocationName(ride.pickup_location),
              coordinates: [pickupLng, pickupLat] as [number, number]
            },
            dropoff: {
              name: extractLocationName(ride.dropoff_location),
              coordinates: dropoffCoords ? dropoffCoords as [number, number] : [0, 0] as [number, number]
            },
            pickup_location: ride.pickup_location,
            dropoff_location: ride.dropoff_location,
            ride_option: rideOptionData,
            status: ride.status as 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
            price: ride.price,
            currency: ride.currency,
            distance: ride.distance,
            duration: ride.duration,
            start_time: ride.start_time,
            end_time: ride.end_time,
            payment_method: ride.payment_method,
            created_at: ride.created_at,
            passenger: ride.passenger,
            distance_to_pickup: Number(distanceToPickup.toFixed(1))
          };
          
          return rideRequest;
        });
      
      // Sort by distance to pickup
      nearbyRides.sort((a, b) => 
        (a.distance_to_pickup || 0) - (b.distance_to_pickup || 0)
      );
      
      console.log(`Processed ${nearbyRides.length} nearby rides`);
      
      // Set ride requests
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
      // First check if ride is still available
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
          driver_id: userId,
          status: 'confirmed',
          start_time: new Date().toISOString(),
          driver_location: {
            longitude: coordinates[0],
            latitude: coordinates[1],
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', ride.id);
        
      if (updateError) throw updateError;
      
      // Get updated ride details
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
      return; // Don't subscribe if not eligible
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
          filter: `status=eq.searching`
        },
        (payload) => {
          console.log("Received real-time update:", payload);
          // Reload ride requests when changes occur
          loadRideRequests();
        }
      )
      .subscribe();
      
    return () => {
      console.log("Removing ride updates subscription");
      supabase.removeChannel(channel);
    };
  }, [userId, coordinates, isEligible]);

  return { 
    rideRequests, 
    loading, 
    loadRideRequests, 
    acceptRide,
    acceptingRide 
  };
}
