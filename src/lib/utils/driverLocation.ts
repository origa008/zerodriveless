
import { supabase } from '@/integrations/supabase/client';
import { DriverDetails } from '@/types/database';

/**
 * Updates the driver's current location in the database
 * @param userId Driver's user ID
 * @param coordinates Longitude and latitude as [number, number]
 * @returns Promise resolving to true if update succeeded, false otherwise
 */
export async function updateDriverLocation(userId: string, coordinates: [number, number]): Promise<boolean> {
  try {
    // Call the database function to update location
    const { data, error } = await supabase
      .rpc('update_driver_location', {
        driver_id: userId,
        longitude: coordinates[0],
        latitude: coordinates[1]
      });
      
    if (error) {
      console.error('Error updating driver location:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error updating driver location:', error);
    return false;
  }
};

/**
 * Gets the driver's current location from the database
 * @param userId Driver's user ID
 * @returns Promise resolving to coordinates or null if not found
 */
export async function getDriverLocation(userId: string): Promise<[number, number] | null> {
  try {
    const { data, error } = await supabase
      .from('driver_details')
      .select('current_location')
      .eq('user_id', userId)
      .single();

    if (error || !data?.current_location) {
      if (error) console.error('Error getting driver location:', error);
      return null;
    }

    // Get x and y values from the point
    const point = data.current_location;
    return [point.x, point.y];
  } catch (error) {
    console.error('Error getting driver location:', error);
    return null;
  }
};

/**
 * Find nearby ride requests for a driver
 * @param coordinates Driver's current coordinates [longitude, latitude]
 * @param radiusKm Search radius in kilometers
 * @returns Promise resolving to array of nearby ride requests
 */
export async function findNearbyRideRequests(
  coordinates: [number, number], 
  radiusKm: number = 5
): Promise<any[]> {
  try {
    // Find rides that are searching and don't have a driver assigned
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);
      
    if (error) {
      console.error('Error fetching nearby rides:', error);
      return [];
    }
    
    if (!data?.length) return [];
    
    // Calculate distance from driver for each ride
    const ridesWithDistance = data.map(ride => {
      const pickupCoords = ride.pickup_location.coordinates || 
        [ride.pickup_location.longitude, ride.pickup_location.latitude];
        
      const distance = calculateDistance(coordinates, pickupCoords);
      
      return {
        ...ride,
        distance
      };
    });
    
    // Filter rides by distance and sort by closest first
    return ridesWithDistance
      .filter(ride => ride.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error finding nearby rides:', error);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 Coordinates [longitude, latitude]
 * @param point2 Coordinates [longitude, latitude]
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: [number, number], point2: [number, number]): number {
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
