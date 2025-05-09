
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
export function extractLocationName(locationData: any): string {
  if (!locationData) return "Unknown";
  
  try {
    // If it's a string, try to parse as JSON
    if (typeof locationData === 'string') {
      try {
        const parsed = JSON.parse(locationData);
        return parsed?.name || "Unknown";
      } catch (e) {
        return "Unknown";
      }
    }
    
    // If it's an object, get the name property
    if (typeof locationData === 'object' && locationData !== null) {
      return locationData.name || "Unknown";
    }
  } catch (error) {
    console.error("Error extracting location name:", error);
  }
  
  return "Unknown";
}
