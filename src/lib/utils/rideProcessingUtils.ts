
import { RideRequest } from '@/lib/types';
import { extractCoordinates, extractLocationName, calculateDistance } from '@/lib/utils/locationUtils';

/**
 * Process ride data from database into properly typed RideRequest objects
 */
export function processRideData(
  rideData: any, 
  driverCoordinates: [number, number] | null,
  maxDistance: number
): RideRequest[] {
  if (!rideData || !driverCoordinates) {
    return [];
  }
  
  // Process each ride to create properly typed RideRequest objects
  const processedRides = rideData
    .map(ride => {
      try {
        // Extract coordinates from pickup_location
        const pickupCoordinates = extractCoordinates(ride.pickup_location);
        if (!pickupCoordinates) {
          console.warn(`Could not extract coordinates from pickup_location for ride ${ride.id}`);
          return null;
        }
        
        // Calculate distance to pickup
        const distanceToPickup = calculateDistance(driverCoordinates, pickupCoordinates);
        
        // Extract dropoff coordinates
        const dropoffCoordinates = extractCoordinates(ride.dropoff_location) || [0, 0] as [number, number];
        
        // Create a default ride option if none exists
        let rideOption = {
          id: '1',
          name: 'Standard',
          type: 'car',
          basePrice: 0
        };
        
        // Try to parse ride_option if it exists
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
              console.error("Error parsing ride_option:", e);
            }
          } else if (typeof ride.ride_option === 'object' && ride.ride_option !== null) {
            const opt = ride.ride_option as any;
            rideOption = {
              id: opt.id || '1',
              name: opt.name || 'Standard',
              type: opt.type || 'car',
              basePrice: opt.basePrice || ride.price || 0
            };
          }
        }
        
        // Create ride request object
        const rideRequest: RideRequest = {
          id: ride.id,
          passenger_id: ride.passenger_id,
          driver_id: ride.driver_id,
          pickup: {
            name: extractLocationName(ride.pickup_location),
            coordinates: pickupCoordinates
          },
          dropoff: {
            name: extractLocationName(ride.dropoff_location),
            coordinates: dropoffCoordinates
          },
          pickup_location: ride.pickup_location,
          dropoff_location: ride.dropoff_location,
          ride_option: rideOption,
          status: ride.status as 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
          price: ride.price || 0,
          currency: ride.currency || 'RS',
          distance: ride.distance || 0,
          duration: ride.duration || 0,
          start_time: ride.start_time,
          end_time: ride.end_time,
          payment_method: ride.payment_method || 'cash',
          created_at: ride.created_at,
          passenger: ride.passenger,
          distance_to_pickup: distanceToPickup
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
    
  console.log(`Found ${processedRides.length} rides within ${maxDistance}km`);
  return processedRides;
}
