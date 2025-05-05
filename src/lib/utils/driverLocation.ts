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
    // Using a raw query to update the current_location field
    const { error } = await supabase.rpc(
      'update_driver_location',
      { 
        driver_id: driverId, 
        longitude, 
        latitude 
      }
    );
      
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
    // Use a raw query to get the location since TypeScript doesn't recognize the current_location field
    const { data, error } = await supabase.rpc(
      'get_driver_location',
      { driver_id: driverId }
    );
      
    if (error || !data) {
      console.error('Error getting driver location:', error);
      return null;
    }
    
    // Parse coordinates from the response
    if (data && Array.isArray(data) && data.length === 2) {
      return data as [number, number];
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
    // Use a raw query to get nearby drivers
    const { data, error } = await supabase.rpc(
      'get_nearby_drivers',
      { 
        center_lng: coordinates[0], 
        center_lat: coordinates[1], 
        radius_km: radiusInKm 
      }
    );
      
    if (error || !data) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
    
    // Parse driver data from the response
    return (data as any[]).map(item => ({
      driverId: item.user_id,
      coordinates: item.coordinates
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
