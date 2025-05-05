
import { supabase } from '@/integrations/supabase/client'
import { RideRequest } from '@/lib/types'
import { extractCoordinates, extractLocationName } from '@/lib/utils/locationUtils'

// Types for ride request status
type RideStatus = 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

// Create a new ride request
export async function createRideRequest(
  passengerId: string,
  pickupLocation: { lat: number; lng: number; name?: string },
  dropoffLocation: { lat: number; lng: number; name?: string }
): Promise<RideRequest | null> {
  try {
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: { 
          name: pickupLocation.name || 'Pickup', 
          coordinates: [pickupLocation.lng, pickupLocation.lat] 
        },
        dropoff_location: {
          name: dropoffLocation.name || 'Dropoff',
          coordinates: [dropoffLocation.lng, dropoffLocation.lat]
        },
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
        name: extractLocationName(ride.pickup_location),
        coordinates: extractCoordinates(ride.pickup_location) || [0, 0] as [number, number]
      },
      dropoff: {
        name: extractLocationName(ride.dropoff_location),
        coordinates: extractCoordinates(ride.dropoff_location) || [0, 0] as [number, number]
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
  radiusInKm: number = 10
): Promise<RideRequest[]> {
  try {
    console.log(`Fetching nearby ride requests at [${driverLng},${driverLat}], radius: ${radiusInKm}km`);
    
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!passenger_id (id, name, avatar)
      `)
      .eq('status', 'searching')
      .is('driver_id', null);

    if (error) {
      console.error('Error fetching nearby ride requests:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No ride requests found in searching status');
      return [];
    }

    console.log(`Found ${data.length} ride requests in searching status`);

    // Convert database response to RideRequest type and calculate distances
    const rideRequests: RideRequest[] = data
      .map((ride: any) => {
        try {
          // Extract coordinates
          const pickupCoords = extractCoordinates(ride.pickup_location);
          if (!pickupCoords) {
            console.warn('Could not extract coordinates for ride:', ride.id);
            return null;
          }
          
          // Calculate distance
          const [pickupLng, pickupLat] = pickupCoords;
          const distance = calculateDistance(
            [driverLng, driverLat],
            [pickupLng, pickupLat]
          );
          
          return {
            id: ride.id,
            passenger_id: ride.passenger_id,
            driver_id: ride.driver_id,
            pickup: {
              name: extractLocationName(ride.pickup_location),
              coordinates: pickupCoords
            },
            dropoff: {
              name: extractLocationName(ride.dropoff_location),
              coordinates: extractCoordinates(ride.dropoff_location) || [0, 0]
            },
            pickup_location: ride.pickup_location,
            dropoff_location: ride.dropoff_location,
            ride_option: ride.ride_option || { name: 'Standard' },
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
            passenger: ride.passenger,
            distance_to_pickup: parseFloat(distance.toFixed(2))
          };
        } catch (e) {
          console.error('Error processing ride:', e);
          return null;
        }
      })
      .filter(Boolean) as RideRequest[];

    // Filter by distance and sort by nearest
    const nearbyRides = rideRequests
      .filter(ride => ride.distance_to_pickup <= radiusInKm)
      .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);
    
    console.log(`Returning ${nearbyRides.length} rides within ${radiusInKm}km radius`);
    return nearbyRides;
  } catch (error: any) {
    console.error('Error fetching nearby ride requests:', error);
    return [];
  }
}

// Calculate distance between two points using Haversine formula
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

// Accept a ride request
export const acceptRideRequest = async (
  rideId: string,
  driverId: string,
  location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Driver ${driverId} attempting to accept ride ${rideId}`);
    
    // Check if ride is still available
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .eq('status', 'searching')
      .is('driver_id', null)
      .single();

    if (rideError || !ride) {
      console.error('Ride not available:', rideError);
      return { success: false, error: 'This ride is no longer available' };
    }

    // Update ride with driver info
    const updateData: any = {
      driver_id: driverId,
      status: 'confirmed',
      start_time: new Date().toISOString()
    };

    // Add driver location if available
    if (location) {
      updateData.driver_location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        updated_at: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId);

    if (error) {
      console.error('Error updating ride:', error);
      throw error;
    }

    console.log(`Ride ${rideId} successfully accepted by driver ${driverId}`);
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

// Manually create a test ride
export async function createTestRide(userId: string): Promise<{ success: boolean; rideId?: string; error?: string }> {
  try {
    console.log("Creating test ride for development");
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: userId,
        pickup_location: { 
          name: "Test Pickup Location", 
          coordinates: [73.0479, 33.6844] 
        },
        dropoff_location: {
          name: "Test Dropoff Location",
          coordinates: [73.0682, 33.7294]
        },
        status: 'searching',
        price: 250,
        distance: 5.2,
        duration: 15,
        ride_option: { name: 'Standard', type: 'car' },
        currency: 'RS',
        payment_method: 'cash'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test ride:', error);
      return { success: false, error: error.message };
    }

    console.log("Test ride created:", data.id);
    return { success: true, rideId: data.id };
  } catch (error: any) {
    console.error('Error creating test ride:', error);
    return { success: false, error: error.message };
  }
}
