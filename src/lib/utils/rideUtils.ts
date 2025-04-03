
import { supabase } from "@/integrations/supabase/client";
import { Ride, Location, RideOption, PaymentMethod } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";

/**
 * Creates a new ride request in the database
 */
export const createRideRequest = async (
  passengerId: string,
  pickupLocation: Location,
  dropoffLocation: Location,
  rideOption: RideOption,
  price: number,
  distance: number,
  duration: number,
  paymentMethod: PaymentMethod = 'cash'
): Promise<{ rideId: string | null; error: string | null }> => {
  try {
    const rideData = {
      passenger_id: passengerId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      ride_option: rideOption,
      price,
      distance,
      duration,
      status: 'searching',
      payment_method: paymentMethod,
      currency: 'RS'
    };
    
    const { data, error } = await supabase
      .from('rides')
      .insert(rideData)
      .select('id')
      .single();
    
    if (error) throw error;
    
    return { rideId: data.id, error: null };
  } catch (error: any) {
    console.error("Create ride request error:", error.message);
    return { rideId: null, error: error.message };
  }
};

/**
 * Gets all available ride requests for drivers
 */
export const getAvailableRideRequests = async (): Promise<{ rides: any[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { rides: data || [], error: null };
  } catch (error: any) {
    console.error("Get available rides error:", error.message);
    return { rides: [], error: error.message };
  }
};

/**
 * Accepts a ride request (for drivers)
 */
export const acceptRideRequest = async (
  rideId: string, 
  driverId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rides')
      .update({ 
        driver_id: driverId,
        status: 'confirmed'
      })
      .eq('id', rideId)
      .eq('status', 'searching');
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Accept ride request error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Updates ride status
 */
export const updateRideStatus = async (
  rideId: string,
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
  additionalData: any = {}
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const updateData = {
      status,
      ...additionalData
    };
    
    // Add timestamps based on status
    if (status === 'in_progress') {
      updateData.start_time = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.end_time = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Update ride status error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Gets ride details
 */
export const getRideDetails = async (rideId: string): Promise<{ ride: any | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();
    
    if (error) throw error;
    
    return { ride: data, error: null };
  } catch (error: any) {
    console.error("Get ride details error:", error.message);
    return { ride: null, error: error.message };
  }
};

/**
 * Subscribes to ride status updates
 */
export const subscribeToRideUpdates = (
  rideId: string,
  callback: (ride: any) => void
) => {
  const channel = supabase
    .channel(`ride:${rideId}`)
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
    
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribes to new ride requests (for drivers)
 */
export const subscribeToNewRideRequests = (
  callback: (ride: any) => void
) => {
  const channel = supabase
    .channel('new_rides')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: `status=eq.searching`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
