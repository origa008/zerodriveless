
import { Location } from '@/lib/types';

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
        console.error('Error parsing location string:', e, location);
        return null;
      }
    }
    
    console.log('Extracting coordinates from:', location);
    
    // Check if coordinates exist directly
    if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      console.log('Found coordinates array:', location.coordinates);
      return location.coordinates as [number, number];
    }
    
    // Check for x,y format
    if (location.x !== undefined && location.y !== undefined) {
      console.log('Found x,y coordinates:', [location.x, location.y]);
      return [location.x, location.y];
    }
    
    // Check for longitude,latitude format
    if (location.longitude !== undefined && location.latitude !== undefined) {
      console.log('Found longitude,latitude format:', [location.longitude, location.latitude]);
      return [location.longitude, location.latitude];
    }
    
    // Check for lng,lat format
    if (location.lng !== undefined && location.lat !== undefined) {
      console.log('Found lng,lat format:', [location.lng, location.lat]);
      return [location.lng, location.lat];
    }
    
    // If it's an array of length 2, assume it's coordinates
    if (Array.isArray(location) && location.length === 2) {
      const [first, second] = location;
      if (typeof first === 'number' && typeof second === 'number') {
        console.log('Found direct array coordinates:', location);
        return [first, second];
      }
    }
    
    console.warn('Could not extract coordinates from location:', location);
    return null;
  } catch (e) {
    console.error('Error extracting coordinates:', e, location);
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
    if (typeof location === 'object' && location !== null) {
      if ('name' in location && location.name) {
        return String(location.name);
      }
      // Check for display_name (common in some geocoding APIs)
      if ('display_name' in location && location.display_name) {
        return String(location.display_name);
      }
      // Check for address
      if ('address' in location && typeof location.address === 'object' && location.address !== null) {
        const address = location.address;
        // Try to build a name from address components
        const parts = [];
        if (address.road) parts.push(address.road);
        if (address.house_number) parts.push(address.house_number);
        if (address.city) parts.push(address.city);
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
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

/**
 * Format location for display
 */
export const formatLocationForDisplay = (location: Location): string => {
  if (location.name && location.name !== "Unknown") {
    return location.name;
  }
  
  if (location.address) {
    return location.address;
  }
  
  if (location.coordinates) {
    return `${location.coordinates[1].toFixed(6)}, ${location.coordinates[0].toFixed(6)}`;
  }
  
  return "Unknown location";
};
