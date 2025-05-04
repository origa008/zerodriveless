
import { supabase } from '@/integrations/supabase/client';
import { RideRequest, RideOption, Location, Json } from '@/lib/types';

/**
 * Get nearby ride requests for drivers
 * @param driverLat Driver's latitude
 * @param driverLng Driver's longitude
 * @param radiusInKm Radius to search within (km)
 */
export async function getNearbyRideRequests(
  driverLat: number,
  driverLng: number,
  radiusInKm: number = 10
): Promise<RideRequest[]> {
  try {
    console.log(`Fetching nearby ride requests for driver at [${driverLng}, ${driverLat}] within ${radiusInKm}km`);
    
    // Query rides table for searching rides
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
      console.error('Error fetching nearby ride requests:', error);
      return [];
    }

    if (!data) return [];
    
    console.log(`Found ${data.length} ride requests in 'searching' status`);

    // Process and calculate distances
    const ridesWithDistance = data.map(ride => {
      try {
        let pickupCoords: [number, number] = [0, 0];
        
        // Extract coordinates from pickup_location
        if (ride.pickup_location) {
          if (typeof ride.pickup_location === 'string') {
            try {
              const parsed = JSON.parse(ride.pickup_location);
              if (parsed && parsed.coordinates) {
                pickupCoords = parsed.coordinates;
              }
            } catch (e) {
              console.error("Error parsing location:", e);
            }
          } else if (typeof ride.pickup_location === 'object') {
            const locationObj = ride.pickup_location as any;
            // Check if coordinates exist directly
            if (Array.isArray(locationObj.coordinates)) {
              pickupCoords = locationObj.coordinates;
            }
            // Check for x,y format
            else if (locationObj.x !== undefined && locationObj.y !== undefined) {
              pickupCoords = [locationObj.x, locationObj.y];
            } 
            // Check for longitude,latitude format
            else if (locationObj.longitude !== undefined && locationObj.latitude !== undefined) {
              pickupCoords = [locationObj.longitude, locationObj.latitude];
            }
            // Check for lng,lat format
            else if (locationObj.lng !== undefined && locationObj.lat !== undefined) {
              pickupCoords = [locationObj.lng, locationObj.lat];
            }
          }
        }
        
        // Calculate distance from driver to pickup
        const distance = calculateDistance(
          [driverLng, driverLat],
          pickupCoords
        );
        
        // Create proper RideOption object
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

        // Extract location name with proper type checking
        let pickupName = "Unknown";
        if (ride.pickup_location) {
          if (typeof ride.pickup_location === 'string') {
            try {
              const parsed = JSON.parse(ride.pickup_location);
              pickupName = parsed?.name || "Unknown";
            } catch (e) {
              console.error("Error parsing location:", e);
            }
          } else if (typeof ride.pickup_location === 'object' && ride.pickup_location !== null) {
            // Fix: Check if name property exists on the object
            const locationObj = ride.pickup_location as {[key: string]: any};
            pickupName = locationObj.name || "Unknown";
          }
        }
        
        // Create pickup location
        const pickup: Location = {
          name: pickupName,
          coordinates: pickupCoords as [number, number]
        };
        
        // Extract dropoff coordinates
        let dropoffCoords: [number, number] = [0, 0];
        let dropoffName = "Unknown";
        
        if (ride.dropoff_location) {
          if (typeof ride.dropoff_location === 'string') {
            try {
              const parsed = JSON.parse(ride.dropoff_location);
              if (parsed && parsed.coordinates) {
                dropoffCoords = parsed.coordinates;
              }
              dropoffName = parsed?.name || "Unknown";
            } catch (e) {
              console.error("Error parsing location:", e);
            }
          } else if (typeof ride.dropoff_location === 'object' && ride.dropoff_location !== null) {
            const locationObj = ride.dropoff_location as any;
            if (Array.isArray(locationObj.coordinates)) {
              dropoffCoords = locationObj.coordinates;
            } else if (locationObj.longitude !== undefined && locationObj.latitude !== undefined) {
              dropoffCoords = [locationObj.longitude, locationObj.latitude];
            } else if (locationObj.lng !== undefined && locationObj.lat !== undefined) {
              dropoffCoords = [locationObj.lng, locationObj.lat];
            }
            // Fix: Check if name property exists on the object
            dropoffName = locationObj.name || "Unknown";
          }
        }
        
        // Create dropoff location
        const dropoff: Location = {
          name: dropoffName,
          coordinates: dropoffCoords as [number, number]
        };
        
        // Create a properly typed RideRequest object
        const rideRequest: RideRequest = {
          id: ride.id,
          passenger_id: ride.passenger_id,
          driver_id: ride.driver_id,
          pickup,
          dropoff,
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
          distance_to_pickup: parseFloat(distance.toFixed(2))
        };
        
        return rideRequest;
      } catch (err) {
        console.error("Error processing ride:", err);
        return null;
      }
    }).filter(Boolean) as RideRequest[];
    
    // Filter by distance and sort by nearest
    const nearbyRides = ridesWithDistance
      .filter(ride => ride && ride.distance_to_pickup <= radiusInKm)
      .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);
    
    console.log(`Returning ${nearbyRides.length} rides within ${radiusInKm}km`);
    return nearbyRides;
  } catch (error) {
    console.error('Error fetching nearby ride requests:', error);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
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
