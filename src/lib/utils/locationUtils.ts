
import { JsonLocation } from '@/lib/types';

/**
 * Extract coordinates from a location object
 * Handles different possible formats of location data
 */
export function extractCoordinates(locationData: any): [number, number] | null {
  if (!locationData) return null;
  
  try {
    // If it's a string, try to parse as JSON
    if (typeof locationData === 'string') {
      try {
        const parsed = JSON.parse(locationData);
        if (parsed && Array.isArray(parsed.coordinates)) {
          return parsed.coordinates as [number, number];
        }
        return null;
      } catch (e) {
        return null;
      }
    }
    
    // If it's an object, try different property structures
    if (typeof locationData === 'object') {
      // Check for coordinates array
      if (Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) {
        return locationData.coordinates as [number, number];
      }
      
      // Check for x,y format
      if (typeof locationData.x === 'number' && typeof locationData.y === 'number') {
        return [locationData.x, locationData.y];
      }
      
      // Check for longitude,latitude format
      if (typeof locationData.longitude === 'number' && typeof locationData.latitude === 'number') {
        return [locationData.longitude, locationData.latitude];
      }
      
      // Check for lng,lat format
      if (typeof locationData.lng === 'number' && typeof locationData.lat === 'number') {
        return [locationData.lng, locationData.lat];
      }
    }
  } catch (error) {
    console.error("Error extracting coordinates:", error);
  }
  
  return null;
}

/**
 * Extract location name from location object
 * Handles different possible formats
 */
export function extractLocationName(locationData: any, defaultName: string = "Unknown"): string {
  if (!locationData) return defaultName;
  
  try {
    // If it's a string, try to parse as JSON
    if (typeof locationData === 'string') {
      try {
        const parsed = JSON.parse(locationData);
        return parsed?.name || defaultName;
      } catch (e) {
        return defaultName;
      }
    }
    
    // If it's an object, get the name property
    if (typeof locationData === 'object' && locationData !== null) {
      return locationData.name || defaultName;
    }
  } catch (error) {
    console.error("Error extracting location name:", error);
  }
  
  return defaultName;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First point as [longitude, latitude]
 * @param point2 Second point as [longitude, latitude]
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: [number, number], point2: [number, number]): number {
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
