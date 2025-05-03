
import { supabase } from '@/integrations/supabase/client';

/**
 * Get nearby ride requests for drivers
 * @param driverLat Driver's latitude
 * @param driverLng Driver's longitude
 * @param radiusInKm Radius to search within (km)
 */
export async function getNearbyRideRequests(
  driverLat: number,
  driverLng: number,
  radiusInKm: number = 10
): Promise<any[]> {
  try {
    // Query rides table for searching rides
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);

    if (error) {
      console.error('Error fetching nearby ride requests:', error);
      return [];
    }

    if (!data) return [];

    // Process and calculate distances
    const ridesWithDistance = data.map(ride => {
      try {
        let pickupCoords: [number, number];
        
        // Extract coordinates from pickup_location
        if (typeof ride.pickup_location === 'string') {
          try {
            const parsed = JSON.parse(ride.pickup_location);
            pickupCoords = parsed.coordinates || [0, 0];
          } catch (e) {
            pickupCoords = [0, 0];
          }
        } else if (ride.pickup_location && typeof ride.pickup_location === 'object') {
          pickupCoords = Array.isArray(ride.pickup_location.coordinates) 
            ? ride.pickup_location.coordinates 
            : [ride.pickup_location.longitude || 0, ride.pickup_location.latitude || 0];
        } else {
          pickupCoords = [0, 0];
        }
        
        // Calculate distance from driver to pickup
        const distance = calculateDistance(
          [driverLng, driverLat],
          pickupCoords
        );
        
        return {
          ...ride,
          distance: parseFloat(distance.toFixed(2))
        };
      } catch (err) {
        console.error("Error processing ride:", err);
        return null;
      }
    }).filter(Boolean);
    
    // Filter by distance and sort by nearest
    const nearbyRides = ridesWithDistance
      .filter(ride => ride.distance <= radiusInKm)
      .sort((a, b) => a.distance - b.distance);
    
    return nearbyRides;
  } catch (error) {
    console.error('Error fetching nearby ride requests:', error);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
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
