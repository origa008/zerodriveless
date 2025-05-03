
import { supabase } from '@/integrations/supabase/client'
import { RideRequest } from '@/lib/types'

// Types for ride request status
type RideStatus = 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

// Create a new ride request
export async function createRideRequest(
  passengerId: string,
  pickupLocation: { lat: number; lng: number },
  dropoffLocation: { lat: number; lng: number }
): Promise<RideRequest | null> {
  try {
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        status: 'searching' as RideStatus,
        price: 0,
        distance: 0,
        duration: 0,
        ride_option: { name: 'Standard' },
        currency: 'RS',
        payment_method: 'cash'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating ride request:', error)
      return null
    }

    // Convert the response to RideRequest format
    const ride = data as any;
    return {
      id: ride.id,
      passenger_id: ride.passenger_id,
      driver_id: ride.driver_id,
      pickup: {
        name: typeof ride.pickup_location === 'object' ? ride.pickup_location.name || 'Pickup' : 'Pickup',
        coordinates: typeof ride.pickup_location === 'object' ? 
          (Array.isArray(ride.pickup_location.coordinates) ? 
            ride.pickup_location.coordinates : [0, 0]) : [0, 0]
      },
      dropoff: {
        name: typeof ride.dropoff_location === 'object' ? ride.dropoff_location.name || 'Dropoff' : 'Dropoff',
        coordinates: typeof ride.dropoff_location === 'object' ? 
          (Array.isArray(ride.dropoff_location.coordinates) ? 
            ride.dropoff_location.coordinates : [0, 0]) : [0, 0]
      },
      pickup_location: ride.pickup_location,
      dropoff_location: ride.dropoff_location,
      ride_option: ride.ride_option,
      status: ride.status,
      price: ride.price,
      currency: ride.currency,
      distance: ride.distance,
      duration: ride.duration,
      start_time: ride.start_time,
      end_time: ride.end_time,
      payment_method: ride.payment_method,
      created_at: ride.created_at,
      bid_amount: ride.bid_amount,
      passenger: ride.passenger
    };
  } catch (error) {
    console.error('Error creating ride request:', error)
    return null
  }
}

// Get nearby ride requests for drivers
export async function getNearbyRideRequests(
  driverLat: number,
  driverLng: number,
  radiusInKm: number
): Promise<RideRequest[]> {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);

    if (error) {
      console.error('Error fetching nearby ride requests:', error);
      return [];
    }

    // Convert database response to RideRequest type
    const rideRequests: RideRequest[] = (data || []).map((ride: any) => {
      return {
        id: ride.id,
        passenger_id: ride.passenger_id,
        driver_id: ride.driver_id,
        pickup: {
          name: typeof ride.pickup_location === 'object' ? ride.pickup_location.name || 'Pickup' : 'Pickup',
          coordinates: typeof ride.pickup_location === 'object' ? 
            (Array.isArray(ride.pickup_location.coordinates) ? 
              ride.pickup_location.coordinates : [0, 0]) : [0, 0]
        },
        dropoff: {
          name: typeof ride.dropoff_location === 'object' ? ride.dropoff_location.name || 'Dropoff' : 'Dropoff',
          coordinates: typeof ride.dropoff_location === 'object' ? 
            (Array.isArray(ride.dropoff_location.coordinates) ? 
              ride.dropoff_location.coordinates : [0, 0]) : [0, 0]
        },
        pickup_location: ride.pickup_location,
        dropoff_location: ride.dropoff_location,
        ride_option: ride.ride_option,
        status: ride.status,
        price: ride.price,
        currency: ride.currency,
        distance: ride.distance,
        duration: ride.duration,
        start_time: ride.start_time,
        end_time: ride.end_time,
        payment_method: ride.payment_method,
        created_at: ride.created_at,
        bid_amount: ride.bid_amount,
        passenger: ride.passenger
      };
    });

    return rideRequests;
  } catch (error: any) {
    console.error('Error fetching nearby ride requests:', error);
    return [];
  }
}

// Accept a ride request
export const acceptRideRequest = async (
  rideId: string,
  driverId: string,
  location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; error?: string }> => {
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
    const updateData: any = {
      driver_id: driverId,
      status: 'confirmed',
      start_time: new Date().toISOString()
    };

    if (location) {
      updateData.driver_location = location;
    }

    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error accepting ride:', error);
    return { success: false, error: error.message };
  }
};

// Start a ride
export async function startRide(rideRequestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rides')
    .update({
      status: 'in_progress' as RideStatus,
      start_time: new Date().toISOString(),
    })
    .eq('id', rideRequestId)
    .eq('status', 'confirmed')

  if (error) {
    console.error('Error starting ride:', error)
    return false
  }

  return true
}

// Complete a ride
export const completeRide = async (
  rideId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', rideId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error completing ride:', error);
    return { success: false, error: error.message };
  }
};

// Cancel a ride
export const cancelRide = async (
  rideId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        end_time: new Date().toISOString(),
        cancellation_reason: reason || 'Cancelled by user'
      })
      .eq('id', rideId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling ride:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to ride request updates
export function subscribeToRideRequests(
  callback: (payload: any) => void
): (() => void) {
  const subscription = supabase
    .channel('ride_requests_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
      },
      callback
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe()
  }
}
