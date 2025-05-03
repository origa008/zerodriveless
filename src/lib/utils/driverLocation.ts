
import { supabase } from '@/integrations/supabase/client';

/**
 * Updates the driver's location in the database
 * @param driverId The ID of the driver
 * @param coordinates [longitude, latitude]
 */
export async function updateDriverLocation(
  driverId: string, 
  coordinates: [number, number]
): Promise<boolean> {
  const [longitude, latitude] = coordinates;
  
  try {
    // Format point for PostGIS
    const point = { x: longitude, y: latitude };
    
    // Update driver's location
    const { error } = await supabase.rpc('update_driver_location', {
      driver_id: driverId,
      longitude,
      latitude
    });
      
    if (error) {
      console.error('Error updating driver location:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error updating driver location:', err);
    return false;
  }
}

/**
 * Gets the driver's current location
 * @param driverId The ID of the driver
 * @returns The driver's current location as [longitude, latitude] or null
 */
export async function getDriverLocation(
  driverId: string
): Promise<[number, number] | null> {
  try {
    const { data, error } = await supabase
      .from('driver_details')
      .select('current_location')
      .eq('user_id', driverId)
      .single();
      
    if (error || !data) {
      console.error('Error getting driver location:', error);
      return null;
    }
    
    // Extract coordinates from point
    const location = data.current_location as any;
    if (!location) return null;
    
    return [location.x, location.y];
  } catch (err) {
    console.error('Error getting driver location:', err);
    return null;
  }
}

/**
 * Gets nearby drivers within a certain radius
 * @param coordinates Central point [longitude, latitude]
 * @param radiusInKm Radius to search within (km)
 * @returns Array of driver IDs and their locations
 */
export async function getNearbyDrivers(
  coordinates: [number, number], 
  radiusInKm: number = 5
): Promise<{ driverId: string; coordinates: [number, number] }[]> {
  try {
    const { data, error } = await supabase
      .from('driver_details')
      .select('user_id, current_location');
      
    if (error) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
    
    // Filter out drivers with no location
    const driversWithLocation = data.filter(driver => driver.current_location);
    
    // Filter drivers by distance (simple distance calculation)
    const nearbyDrivers = driversWithLocation.filter(driver => {
      const driverCoords: [number, number] = [
        (driver.current_location as any).x, 
        (driver.current_location as any).y
      ];
      
      const distance = calculateDistance(coordinates, driverCoords);
      return distance <= radiusInKm;
    });
    
    return nearbyDrivers.map(driver => ({
      driverId: driver.user_id,
      coordinates: [(driver.current_location as any).x, (driver.current_location as any).y]
    }));
  } catch (err) {
    console.error('Error getting nearby drivers:', err);
    return [];
  }
}

/**
 * Find nearby ride requests for drivers
 * @param coordinates Central point [longitude, latitude]
 * @param radiusInKm Radius to search within (km)
 * @returns Array of rides matching criteria
 */
export async function findNearbyRideRequests(
  coordinates: [number, number],
  radiusInKm: number = 10
): Promise<any[]> {
  try {
    const [longitude, latitude] = coordinates;
    
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);
    
    if (error) {
      console.error('Error fetching ride requests:', error);
      return [];
    }
    
    // Process and filter rides based on distance
    const nearbyRides = data.map(ride => {
      let pickupCoords: [number, number];
      
      // Handle different formats of location data
      if (typeof ride.pickup_location === 'string') {
        try {
          const parsed = JSON.parse(ride.pickup_location);
          if (parsed.coordinates) {
            pickupCoords = parsed.coordinates;
          } else if (parsed.longitude !== undefined && parsed.latitude !== undefined) {
            pickupCoords = [parsed.longitude, parsed.latitude];
          } else {
            // Default to a placeholder if structure is unknown
            pickupCoords = [0, 0];
          }
        } catch (e) {
          pickupCoords = [0, 0]; // Default if parsing fails
        }
      } else if (ride.pickup_location && typeof ride.pickup_location === 'object') {
        // Object form
        if (Array.isArray(ride.pickup_location.coordinates)) {
          pickupCoords = ride.pickup_location.coordinates;
        } else if (ride.pickup_location.longitude !== undefined && ride.pickup_location.latitude !== undefined) {
          pickupCoords = [ride.pickup_location.longitude, ride.pickup_location.latitude];
        } else {
          pickupCoords = [0, 0]; // Default if structure is unknown
        }
      } else {
        pickupCoords = [0, 0]; // Default if location is invalid
      }
      
      const distance = calculateDistance([longitude, latitude], pickupCoords);
      
      return {
        ...ride,
        distance: parseFloat(distance.toFixed(2))
      };
    }).filter(ride => ride.distance <= radiusInKm)
      .sort((a, b) => a.distance - b.distance);
      
    return nearbyRides;
  } catch (error) {
    console.error('Error finding nearby rides:', error);
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
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
