
import { RideRequest } from '@/lib/types';
import { calculateDistance } from '@/lib/utils/locationUtils';

/**
 * Process ride data from database and filter by distance
 */
export const processRideData = (
  data: any[],
  userLocation: [number, number],
  maxDistance: number = 2 // Default max distance is 2km
): RideRequest[] => {
  if (!data || !data.length) return [];
  
  // Process and filter rides
  const processedRides = data
    .map(ride => {
      try {
        // Extract pickup coordinates - we expect them to be in format [longitude, latitude]
        const pickupLocation = ride.pickup_location;
        if (!pickupLocation || !pickupLocation.coordinates) {
          console.warn('Invalid pickup location format for ride:', ride.id);
          return null;
        }
        
        // Calculate distance between driver and pickup location
        const pickupCoords = pickupLocation.coordinates;
        const distanceToPickup = calculateDistance(
          userLocation,
          [pickupCoords[0], pickupCoords[1]]
        );
        
        // Add distance to ride object
        return {
          ...ride,
          distance_to_pickup: parseFloat(distanceToPickup.toFixed(1))
        };
      } catch (err) {
        console.error('Error processing ride data:', err);
        return null;
      }
    })
    .filter(Boolean) // Remove any null entries
    .filter(ride => ride.distance_to_pickup <= maxDistance) // Filter by max distance
    .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup); // Sort by nearest first
    
  return processedRides as RideRequest[];
};
