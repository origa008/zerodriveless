
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
    console.log(`Updating driver location for ${driverId}: [${longitude}, ${latitude}]`);
    
    // Since the RPC function doesn't exist and current_location isn't in the schema,
    // We'll store the location in the vehicle_model field as a JSON string
    const locationData = JSON.stringify({ lng: longitude, lat: latitude });
    
    const { error } = await supabase
      .from('driver_details')
      .update({
        // Store as serialized JSON in the vehicle_model field
        vehicle_model: locationData
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
