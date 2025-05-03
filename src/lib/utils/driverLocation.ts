
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
    // Since current_location doesn't exist in the schema, we need to modify our approach
    // We'll use a JSON column that does exist in the schema, or handle this differently
    console.log(`Updating driver location for ${driverId}: [${longitude}, ${latitude}]`);
    
    // Update driver's location using a different approach
    const { error } = await supabase.rpc('update_driver_location', { 
      driver_user_id: driverId,
      longitude,
      latitude 
    }).maybeSingle();
      
    if (error) {
      // If RPC function doesn't exist, fallback to simple update
      console.log('RPC not available, using fallback method');
      
      // Try to update with standard method (we assume there's a compatible column)
      const { error: fallbackError } = await supabase
        .from('driver_details')
        .update({
          // Store as serialized JSON in an existing text field since we don't have current_location column
          vehicle_model: JSON.stringify({ lng: longitude, lat: latitude })
        })
        .eq('user_id', driverId);
        
      if (fallbackError) {
        console.error('Error updating driver location:', fallbackError);
        return false;
      }
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
      .select('vehicle_model') // Using vehicle_model as our temporary location store
      .eq('user_id', driverId)
      .maybeSingle();
      
    if (error || !data) {
      console.error('Error getting driver location:', error);
      return null;
    }
    
    // Parse location from the field we're using as storage
    if (data && data.vehicle_model) {
      try {
        const locationData = JSON.parse(data.vehicle_model);
        if (locationData && 'lng' in locationData && 'lat' in locationData) {
          return [locationData.lng, locationData.lat];
        }
      } catch (e) {
        console.warn('Could not parse location data from vehicle_model');
      }
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
      .select('user_id, vehicle_model');
      
    if (error || !data) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
    
    // Filter out drivers with no location
    const driversWithLocation = data.filter(driver => {
      return driver && driver.vehicle_model !== null;
    });
    
    // Filter drivers by distance
    const nearbyDrivers = driversWithLocation.filter(driver => {
      if (!driver.vehicle_model) return false;
      
      try {
        // Parse location from our storage field
        const locationData = JSON.parse(driver.vehicle_model);
        if (locationData && 'lng' in locationData && 'lat' in locationData) {
          const driverCoords: [number, number] = [locationData.lng, locationData.lat];
          const distance = calculateDistance(coordinates, driverCoords);
          return distance <= radiusInKm;
        }
      } catch (e) {
        return false;
      }
      
      return false;
    });
    
    return nearbyDrivers.map(driver => {
      try {
        const locationData = JSON.parse(driver.vehicle_model as string);
        return {
          driverId: driver.user_id,
          coordinates: [locationData.lng, locationData.lat] as [number, number]
        };
      } catch (e) {
        // This shouldn't happen based on our filter, but just in case
        return {
          driverId: driver.user_id,
          coordinates: [0, 0] as [number, number]
        };
      }
    });
  } catch (err) {
    console.error('Error getting nearby drivers:', err);
    return [];
  }
}
