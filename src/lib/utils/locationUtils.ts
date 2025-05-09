
/**
 * Extract coordinates from location data, safely handling different formats
 * @param location The location data from the database
 * @returns Coordinates as [lng, lat] or null if not found
 */
export function extractCoordinates(location: any): [number, number] | null {
  if (!location) return null;
  
  try {
    // If the location is a string, parse it
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        
        // Check for GeoJSON format
        if (parsed && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
          return [parsed.coordinates[0], parsed.coordinates[1]];
        }
        
        // Check for direct lat/lng
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return [parsed.lng, parsed.lat];
        }
        
        // Check for direct longitude/latitude
        if (parsed && typeof parsed.longitude === 'number' && typeof parsed.latitude === 'number') {
          return [parsed.longitude, parsed.latitude];
        }
      } catch (e) {
        console.warn('Failed to parse location string:', e);
        return null;
      }
    }
    
    // If we get an object directly
    if (typeof location === 'object' && location !== null) {
      // Check for GeoJSON format
      if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
        return [Number(location.coordinates[0]), Number(location.coordinates[1])];
      }
      
      // Check for direct lat/lng
      if (typeof location.lat === 'number' && typeof location.lng === 'number') {
        return [location.lng, location.lat];
      }
      
      // Check for direct longitude/latitude
      if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
        return [location.longitude, location.latitude];
      }
    }
  } catch (err) {
    console.error('Error extracting coordinates:', err);
  }
  
  return null;
}

/**
 * Extract location name from location data, safely handling different formats
 * @param location The location data from the database
 * @param defaultName Default name to return if not found
 * @returns The location name
 */
export function extractLocationName(location: any, defaultName: string = 'Unknown Location'): string {
  if (!location) return defaultName;
  
  try {
    // If the location is a string, parse it
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        if (parsed && typeof parsed.name === 'string') {
          return parsed.name;
        }
      } catch (e) {
        // Silently fail and return default
      }
    }
    
    // If we get an object directly
    if (typeof location === 'object' && location !== null && typeof location.name === 'string') {
      return location.name;
    }
  } catch (err) {
    // Silently fail and return default
  }
  
  return defaultName;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First point as [longitude, latitude]
 * @param point2 Second point as [longitude, latitude]
 * @returns Distance in kilometers
 */
export function calculateDistance(
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
