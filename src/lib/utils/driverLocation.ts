
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
    
    // Update the driver's location using standard Supabase update
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
    // Get driver location with standard query
    const { data, error } = await supabase
      .from('driver_details')
      .select('current_location')
      .eq('user_id', driverId)
      .single();
      
    if (error || !data || !data.current_location) {
      console.error('Error getting driver location:', error);
      return null;
    }
    
    // Parse coordinates from the JSONB response
    const coordinates = data.current_location.coordinates;
    
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      return [Number(coordinates[0]), Number(coordinates[1])];
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
    // Use a spatial query to find drivers within a radius
    const [centerLng, centerLat] = coordinates;
    
    // Calculate approximate bounding box for faster filtering
    const degreePerKm = 1 / 111.0; // rough approximation
    const lngDiff = radiusInKm * degreePerKm;
    const latDiff = radiusInKm * degreePerKm;
    
    // Query drivers within the bounding box
    const { data, error } = await supabase
      .from('driver_details')
      .select('user_id, current_location')
      .not('current_location', 'is', null)
      .gte('current_location->coordinates->1', centerLat - latDiff)
      .lte('current_location->coordinates->1', centerLat + latDiff)
      .gte('current_location->coordinates->0', centerLng - lngDiff)
      .lte('current_location->coordinates->0', centerLng + lngDiff);
      
    if (error) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Filter results using Haversine distance and format response
    return data
      .filter(item => {
        if (!item.current_location || !item.current_location.coordinates) {
          return false;
        }
        
        const driverCoords = item.current_location.coordinates;
        if (!Array.isArray(driverCoords) || driverCoords.length !== 2) {
          return false;
        }
        
        // Calculate actual distance
        const distance = calculateDistance(
          coordinates,
          [Number(driverCoords[0]), Number(driverCoords[1])]
        );
        
        return distance <= radiusInKm;
      })
      .map(item => ({
        driverId: item.user_id,
        coordinates: [
          Number(item.current_location.coordinates[0]), 
          Number(item.current_location.coordinates[1])
        ] as [number, number]
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
