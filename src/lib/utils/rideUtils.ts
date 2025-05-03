
import { supabase } from '@/integrations/supabase/client';

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

// Update a ride status
export const updateRideStatus = async (
  rideId: string,
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rides')
      .update({ status })
      .eq('id', rideId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating ride status:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to ride status changes
export const subscribeToRideStatus = (
  rideId: string,
  callback: (updatedRide: any) => void
): (() => void) => {
  const subscription = supabase
    .channel(`ride_status_${rideId}`)
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};

// Get available ride requests for drivers
export const getAvailableRideRequests = async (
  driverId: string
): Promise<{ rides: any[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);
      
    return { rides: data || [], error };
  } catch (error) {
    console.error('Error getting ride requests:', error);
    return { rides: [], error };
  }
};

// Subscribe to new ride requests
export const subscribeToNewRideRequests = (
  callback: (newRide: any) => void
): (() => void) => {
  const subscription = supabase
    .channel('new_ride_requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};
