/**
 * Extract coordinates from a location object which could be in various formats
 * @param location Location object from database
 * @returns [longitude, latitude] tuple or null if coordinates can't be extracted
 */
export function extractCoordinates(location: any): [number, number] | null {
  if (!location) return null;
  
  try {
    // Handle string (JSON) format
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        if (parsed && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
          return [Number(parsed.coordinates[0]), Number(parsed.coordinates[1])];
        }
        
        if (parsed && typeof parsed.lng === 'number' && typeof parsed.lat === 'number') {
          return [parsed.lng, parsed.lat];
        }
        
        if (parsed && typeof parsed.longitude === 'number' && typeof parsed.latitude === 'number') {
          return [parsed.longitude, parsed.latitude];
        }
      } catch (e) {
        console.error('Error parsing location string:', e);
        return null;
      }
    }
    
    // Handle object format
    if (typeof location === 'object' && location !== null) {
      // Format: { coordinates: [lng, lat] }
      if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
        return [Number(location.coordinates[0]), Number(location.coordinates[1])];
      }
      
      // Format: { lng, lat }
      if (typeof location.lng === 'number' && typeof location.lat === 'number') {
        return [location.lng, location.lat];
      }
      
      // Format: { longitude, latitude }
      if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
        return [location.longitude, location.latitude];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

/**
 * Extract location name from a location object
 * @param location Location object from database
 * @returns Location name or default value if no name found
 */
export function extractLocationName(location: any, defaultName: string = 'Unknown Location'): string {
  if (!location) return defaultName;
  
  try {
    // Handle string (JSON) format
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        return parsed?.name || defaultName;
      } catch (e) {
        return defaultName;
      }
    }
    
    // Handle object format
    if (typeof location === 'object' && location !== null) {
      return location.name || defaultName;
    }
    
    return defaultName;
  } catch (error) {
    return defaultName;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 [longitude, latitude]
 * @param point2 [longitude, latitude]
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
