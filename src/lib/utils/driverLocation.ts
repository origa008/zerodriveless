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
    // Update driver's location directly in the driver_details table
    const { error } = await supabase
      .from('driver_details')
      .update({
        current_location: { x: longitude, y: latitude }
      })
      .eq('user_id', driverId);
      
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
    
    if (!data.current_location) return null;
    
    // Parse the location data
    const location = data.current_location as any;
    if (typeof location === 'object' && 'x' in location && 'y' in location) {
      return [location.x, location.y];
    }
    
    return null;
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
      
    if (error || !data) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
    
    // Filter out drivers with no location
    const driversWithLocation = data.filter(driver => driver.current_location);
    
    // Filter drivers by distance
    const nearbyDrivers = driversWithLocation.filter(driver => {
      if (!driver.current_location) return false;
      
      const driverLocation = driver.current_location as any;
      if (!driverLocation || !('x' in driverLocation) || !('y' in driverLocation)) return false;
      
      const driverCoords: [number, number] = [driverLocation.x, driverLocation.y];
      const distance = calculateDistance(coordinates, driverCoords);
      return distance <= radiusInKm;
    });
    
    return nearbyDrivers.map(driver => {
      const location = driver.current_location as any;
      return {
        driverId: driver.user_id,
        coordinates: [location.x, location.y]
      };
    });
  } catch (err) {
    console.error('Error getting nearby drivers:', err);
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
