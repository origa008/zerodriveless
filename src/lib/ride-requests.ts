import { supabase } from '@/integrations/supabase/client'
import { Database } from '@/integrations/supabase/types'

// Types for ride request status and data
type RideStatus = 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

interface RideRequest {
  id: string
  passenger_id: string
  driver_id?: string
  pickup_location: { lat: number; lng: number }
  dropoff_location: { lat: number; lng: number }
  status: RideStatus
  created_at: string
  started_at?: string
  completed_at?: string
  cancelled_at?: string
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
export async function acceptRideRequest(
  rideRequestId: string,
  driverId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ride_requests')
    .update({
      driver_id: driverId,
      status: 'confirmed' as RideStatus,
    })
    .eq('id', rideRequestId)
    .eq('status', 'searching')

  if (error) {
    console.error('Error accepting ride request:', error)
    return false
  }

  return true
}

// Start a ride
export async function startRide(rideRequestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ride_requests')
    .update({
      status: 'in_progress' as RideStatus,
      started_at: new Date().toISOString(),
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
export async function completeRide(rideRequestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ride_requests')
    .update({
      status: 'completed' as RideStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', rideRequestId)
    .eq('status', 'in_progress')

  if (error) {
    console.error('Error completing ride:', error)
    return false
  }

  return true
}

// Cancel a ride
export async function cancelRide(
  rideRequestId: string,
  reason?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ride_requests')
    .update({
      status: 'cancelled' as RideStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', rideRequestId)
    .not('status', 'in', ['completed', 'cancelled'])

  if (error) {
    console.error('Error cancelling ride:', error)
    return false
  }

  return true
}

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