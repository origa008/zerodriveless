
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
  
  return R * c;
}

/**
 * Extract coordinates from location data
 * @param locationData Any location object format
 * @returns [longitude, latitude] coordinates or null
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
      return [Number(locationData.coordinates[0]), Number(locationData.coordinates[1])];
    }
    
    // Check for x,y format
    if (locationData.x !== undefined && locationData.y !== undefined) {
      return [Number(locationData.x), Number(locationData.y)];
    }
    
    // Check for longitude,latitude format
    if (locationData.longitude !== undefined && locationData.latitude !== undefined) {
      return [Number(locationData.longitude), Number(locationData.latitude)];
    }
    
    // Check for lng,lat format
    if (locationData.lng !== undefined && locationData.lat !== undefined) {
      return [Number(locationData.lng), Number(locationData.lat)];
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting coordinates:', e);
    return null;
  }
}

/**
 * Extract location name from location data
 * @param locationData Any location object format
 * @returns Location name or "Unknown"
 */
export function extractLocationName(locationData: any): string {
  try {
    if (!locationData) return "Unknown";
    
    // Handle string JSON
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        return "Unknown";
      }
    }
    
    // Check if name exists directly on the object
    if (typeof locationData === 'object' && locationData !== null && 'name' in locationData) {
      return locationData.name || "Unknown";
    }
    
    return "Unknown";
  } catch (e) {
    return "Unknown";
  }
}
