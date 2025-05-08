
/**
 * Utility functions for location handling
 */

/**
 * Extract coordinates from location object
 */
export function extractCoordinates(locationData: any): [number, number] | null {
  try {
    if (!locationData) return null;
    
    // Handle string JSON
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        return null;
      }
    }
    
    // Check if coordinates exist directly
    if (locationData.coordinates && Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) {
      return locationData.coordinates as [number, number];
    }
    
    // Check for x,y format
    if (locationData.x !== undefined && locationData.y !== undefined) {
      return [locationData.x, locationData.y];
    }
    
    // Check for longitude,latitude format
    if (locationData.longitude !== undefined && locationData.latitude !== undefined) {
      return [locationData.longitude, locationData.latitude];
    }
    
    // Check for lng,lat format
    if (locationData.lng !== undefined && locationData.lat !== undefined) {
      return [locationData.lng, locationData.lat];
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting coordinates:', e);
    return null;
  }
}

/**
 * Extract location name from location object
 */
export function extractLocationName(locationData: any, defaultName: string = "Unknown Location"): string {
  try {
    if (!locationData) return defaultName;
    
    // Handle string JSON
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        return defaultName;
      }
    }
    
    // Check if name exists directly on the object
    if (typeof locationData === 'object' && locationData !== null && 'name' in locationData) {
      return locationData.name || defaultName;
    }
    
    return defaultName;
  } catch (e) {
    return defaultName;
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
