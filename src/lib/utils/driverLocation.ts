
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
    console.log(`Updating driver location for ${driverId}: [${longitude}, ${latitude}]`);
    
    // Update the driver's location in the driver_details table
    const { error } = await supabase
      .from('driver_details')
      .update({
        current_location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          updated_at: new Date().toISOString()
        }
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
      .maybeSingle();
      
    if (error || !data || !data.current_location) {
      console.error('Error getting driver location:', error);
      return null;
    }
    
    // Parse location from the current_location JSON field
    if (data.current_location?.coordinates && 
        Array.isArray(data.current_location.coordinates) && 
        data.current_location.coordinates.length === 2) {
      return data.current_location.coordinates as [number, number];
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
    // Get all driver details
    const { data, error } = await supabase
      .from('driver_details')
      .select('user_id, current_location');
      
    if (error || !data) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
    
    // Filter out drivers with no location
    const driversWithLocation = data.filter(driver => 
      driver && driver.current_location && 
      driver.current_location.coordinates && 
      Array.isArray(driver.current_location.coordinates)
    );
    
    // Calculate distance and filter by radius
    const nearbyDrivers = driversWithLocation.map(driver => {
      const driverCoords = driver.current_location.coordinates as [number, number];
      const distance = calculateDistance(coordinates, driverCoords);
      
      return {
        driverId: driver.user_id,
        coordinates: driverCoords,
        distance
      };
    }).filter(driver => driver.distance <= radiusInKm)
      .sort((a, b) => a.distance - b.distance);
    
    // Return only the necessary data
    return nearbyDrivers.map(({ driverId, coordinates }) => ({
      driverId,
      coordinates
    }));
  } catch (err) {
    console.error('Error getting nearby drivers:', err);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
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
