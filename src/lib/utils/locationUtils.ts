
import { Json, Location } from '@/lib/types';

/**
 * Extract coordinates from location object with type safety
 */
export const extractCoordinates = (location: any): [number, number] | null => {
  if (!location) return null;
  
  try {
    // Handle string JSON
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        return null;
      }
    }
    
    // Check if coordinates exist directly
    if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      return location.coordinates as [number, number];
    }
    
    // Check for x,y format
    if (location.x !== undefined && location.y !== undefined) {
      return [location.x, location.y];
    }
    
    // Check for longitude,latitude format
    if (location.longitude !== undefined && location.latitude !== undefined) {
      return [location.longitude, location.latitude];
    }
    
    // Check for lng,lat format
    if (location.lng !== undefined && location.lat !== undefined) {
      return [location.lng, location.lat];
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting coordinates:', e);
    return null;
  }
};

/**
 * Extract name from location object with type safety
 */
export const extractLocationName = (location: any): string => {
  if (!location) return "Unknown";
  
  try {
    // Handle string JSON
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        return "Unknown";
      }
    }
    
    // Check if name exists directly
    if (typeof location === 'object' && location !== null && 'name' in location) {
      return location.name || "Unknown";
    }
    
    return "Unknown";
  } catch (e) {
    return "Unknown";
  }
};

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (
  point1: [number, number], 
  point2: [number, number]
): number => {
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
};
