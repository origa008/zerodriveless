
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';

/**
 * Gets available ride requests for a driver
 */
export async function getAvailableRideRequests(driverId: string) {
  try {
    const { data: driverDetails, error: driverError } = await supabase
      .from('driver_details')
      .select('current_location')
      .eq('user_id', driverId)
      .single();

    if (driverError || !driverDetails?.current_location) {
      console.error('Error getting driver location:', driverError);
      return { rides: [], error: 'Could not get driver location' };
    }

    // Get coordinates from point
    const lon = driverDetails.current_location.x;
    const lat = driverDetails.current_location.y;

    // Get rides near the driver's current location
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);

    if (error) {
      console.error('Error fetching rides:', error);
      return { rides: [], error: error.message };
    }

    // Calculate distance and filter by proximity
    const nearbyRides = data
      .map(ride => {
        const pickupCoords = ride.pickup_location?.coordinates || 
          [ride.pickup_location?.longitude, ride.pickup_location?.latitude];
        
        const distance = calculateDistance(
          [lon, lat],
          pickupCoords
        );
        
        return {
          ...ride,
          calculatedDistance: distance
        };
      })
      .filter(ride => ride.calculatedDistance <= 10) // Filter rides within 10km
      .sort((a, b) => a.calculatedDistance - b.calculatedDistance); // Sort by closest first

    return { rides: nearbyRides, error: null };
  } catch (error: any) {
    console.error('Error fetching available rides:', error);
    return { rides: [], error: error.message };
  }
}

/**
 * Subscribes to new ride requests
 */
export function subscribeToNewRideRequests(callback: (ride: any) => void) {
  const channel = supabase
    .channel('rides_channel')
    .on('postgres_changes', 
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      },
      payload => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Helper function to calculate distance between two points
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

/**
 * Accept a ride request
 */
export const acceptRideRequest = async (rideId: string, driverId: string) => {
  try {
    // Check if ride is still available
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .eq('status', 'searching')
      .is('driver_id', null)
      .single();

    if (rideError || !ride) {
      return { success: false, error: 'This ride is no longer available' };
    }

    // Update ride with driver info
    const { error } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'confirmed',
        start_time: new Date().toISOString()
      })
      .eq('id', rideId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error accepting ride:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to ride status updates
 */
export function subscribeToRideStatus(rideId: string, callback: (ride: any) => void) {
  const channel = supabase
    .channel(`ride_${rideId}`)
    .on('postgres_changes', 
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`
      },
      payload => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
