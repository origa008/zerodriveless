
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/lib/utils/rideRequests';

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
    // Update driver's location using direct column update 
    const { error } = await supabase
      .from('driver_details')
      .update({
        // Use a serialized object that matches the PostgreSQL point type
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
    
    const location = data.current_location;
    if (!location) return null;
    
    // Parse the location data safely
    if (typeof location === 'object' && location !== null && 'x' in location && 'y' in location) {
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
    const driversWithLocation = data.filter(driver => {
      return driver && driver.current_location !== null;
    });
    
    // Filter drivers by distance
    const nearbyDrivers = driversWithLocation.filter(driver => {
      if (!driver.current_location) return false;
      
      const location = driver.current_location;
      if (typeof location !== 'object' || !location || !('x' in location) || !('y' in location)) return false;
      
      const driverCoords: [number, number] = [location.x, location.y];
      const distance = calculateDistance(coordinates, driverCoords);
      return distance <= radiusInKm;
    });
    
    return nearbyDrivers.map(driver => {
      const location = driver.current_location as any;
      return {
        driverId: driver.user_id,
        coordinates: [location.x, location.y] as [number, number]
      };
    });
  } catch (err) {
    console.error('Error getting nearby drivers:', err);
    return [];
  }
}
