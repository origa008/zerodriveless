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
        placeId: result.place_id,
        coordinates: [
          result.geometry.location.lng,
          result.geometry.location.lat
        ],
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
    const originStr = `${origin[1]},${origin[0]}`; // lat,lng
    const destStr = `${destination[1]},${destination[0]}`; // lat,lng
    
    // First try Google Maps Distance Matrix API
    const response = await fetch(
      `${MAPS_API_BASE_URL}/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&key=${import.meta.env.VITE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance.value / 1000, // Convert meters to kilometers
        duration: Math.ceil(element.duration.value / 60) // Convert seconds to minutes
      };
    }
    
    // Fallback to Haversine formula if API fails
    const [originLng, originLat] = origin;
    const [destLng, destLat] = destination;
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(destLat - originLat);
    const dLon = deg2rad(destLng - originLng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(originLat)) * Math.cos(deg2rad(destLat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Estimate duration based on average speed (30 km/h for urban areas)
    const averageSpeedKmH = 30;
    const estimatedDuration = (distance / averageSpeedKmH) * 60; // Convert to minutes
    
    return {
      distance: Number(distance.toFixed(1)),
      duration: Math.ceil(estimatedDuration)
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};

// Function to get default map location (Lahore, Pakistan)
export const getDefaultLocation = (): Location => {
  return {
    name: 'Lahore, Pakistan',
    address: 'Lahore, Punjab, Pakistan',
    coordinates: DEFAULT_COORDINATES
  };
};
