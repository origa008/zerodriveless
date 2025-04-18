import { supabase } from '@/integrations/supabase/client'
import { Database } from '@/integrations/supabase/types'

// Types for ride request status and data
type RideStatus = 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface RideRequest {
  id: string
  passenger_id: string
  driver_id?: string | null
  pickup_location: any
  dropoff_location: any
  ride_option: any
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ride_column: number
  currency: string
  distance: number
  duration: number
  start_time?: string
  end_time?: string
  payment_method: string
  created_at: string
  bid_amount?: number
  passenger?: any
}

// Create a new ride request
export async function createRideRequest(
  passengerId: string,
  pickupLocation: { lat: number; lng: number },
  dropoffLocation: { lat: number; lng: number }
): Promise<RideRequest | null> {
  const { data, error } = await supabase
    .from('ride_requests')
    .insert({
      passenger_id: passengerId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      status: 'searching' as RideStatus,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating ride request:', error)
    return null
  }

  return data
}

// Get nearby ride requests for drivers
export async function getNearbyRideRequests(
  driverLat: number,
  driverLng: number,
  radiusInKm: number
): Promise<RideRequest[]> {
  const { data, error } = await supabase
    .rpc('get_nearby_ride_requests', {
      driver_lat: driverLat,
      driver_lng: driverLng,
      radius_km: radiusInKm,
    })

  if (error) {
    console.error('Error fetching nearby ride requests:', error)
    return []
  }

  return data || []
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
    const { error } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'confirmed',
        start_time: new Date().toISOString(),
        driver_location: location
      })
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
    .from('ride_requests')
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
        table: 'ride_requests',
      },
      callback
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe()
  }
} 