
import { Location } from '../types';

const MAPS_API_BASE_URL = 'https://maps.gomaps.pro';

// Default location coordinates for Lahore, Pakistan
const DEFAULT_COORDINATES: [number, number] = [74.3587, 31.5204]; // [longitude, latitude]

// Function to search for places based on query
export const searchPlaces = async (query: string): Promise<Location[]> => {
  try {
    if (!query || query.trim().length < 2) return [];
    
    const response = await fetch(
      `${MAPS_API_BASE_URL}/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${import.meta.env.VITE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.predictions.map((prediction: any) => ({
        name: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.description,
        coordinates: DEFAULT_COORDINATES, // Default coordinates until we get the real ones
        placeId: prediction.place_id,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
};

// Function to get place details including coordinates
export const getPlaceDetails = async (placeId: string): Promise<Location | null> => {
  try {
    const response = await fetch(
      `${MAPS_API_BASE_URL}/maps/api/place/details/json?place_id=${placeId}&key=${import.meta.env.VITE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      const { result } = data;
      return {
        name: result.name,
        address: result.formatted_address,
        coordinates: [
          result.geometry.location.lng,
          result.geometry.location.lat
        ],
        placeId: result.place_id,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

// Function to calculate distance between two locations
export const calculateDistance = async (
  origin: [number, number],
  destination: [number, number]
): Promise<{ distance: number; duration: number } | null> => {
  try {
    const originStr = `${origin[1]},${origin[0]}`;  // lat,lng
    const destStr = `${destination[1]},${destination[0]}`;  // lat,lng
    
    const response = await fetch(
      `${MAPS_API_BASE_URL}/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&key=${import.meta.env.VITE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      const element = data.rows[0].elements[0];
      
      if (element.status === 'OK') {
        return {
          distance: element.distance.value / 1000, // Convert meters to kilometers
          duration: Math.ceil(element.duration.value / 60) // Convert seconds to minutes
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
};

// Function to get default map location (Lahore, Pakistan)
export const getDefaultLocation = (): Location => {
  return {
    name: 'Lahore, Pakistan',
    address: 'Lahore, Punjab, Pakistan',
    coordinates: DEFAULT_COORDINATES
  };
};
