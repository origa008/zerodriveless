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
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;
    
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
      currency: 'RS',
      passenger_email: email
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
 * Gets all available ride requests for drivers within their radius
 */
export const getAvailableRideRequests = async (
  driverLat: number,
  driverLng: number,
  radiusKm: number = 5
): Promise<{ rides: any[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .rpc('get_nearby_ride_requests', {
        driver_lat: driverLat,
        driver_lng: driverLng,
        radius_km: radiusKm
      });
    
    if (error) throw error;
    
    // Get passenger details for each ride
    const ridesWithPassengers = await Promise.all(
      (data || []).map(async (ride) => {
        const { data: passenger } = await supabase
          .from('profiles')
          .select('name, avatar')
          .eq('id', ride.passenger_id)
          .single();
        
        return {
          ...ride,
          passenger: passenger || null
        };
      })
    );
    
    return { rides: ridesWithPassengers, error: null };
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
    const { data: { user } } = await supabase.auth.getUser();
    
    // First check if ride is still available
    const { data: ride } = await supabase
      .from('rides')
      .select('status, bid_amount')
      .eq('id', rideId)
      .single();
    
    if (!ride || ride.status !== 'searching') {
      return { 
        success: false, 
        error: 'This ride is no longer available' 
      };
    }
    
    // Update ride status and assign driver
    const { error } = await supabase
      .from('rides')
      .update({ 
        driver_id: driverId,
        status: 'confirmed',
        price: ride.bid_amount, // Ensure price is set to bid_amount
        started_at: new Date().toISOString()
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
 * Subscribes to new ride requests in the driver's area
 */
export const subscribeToNewRideRequests = (
  callback: (ride: any) => void,
  driverLocation: { latitude: number; longitude: number },
  radiusKm: number = 5
) => {
  const channel = supabase
    .channel('nearby_rides')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: `status=eq.searching`
      },
      async (payload) => {
        try {
          const newRide = payload.new;
          
          // Calculate distance to new ride
          const distance = getDistanceFromLatLonInKm(
            driverLocation.latitude,
            driverLocation.longitude,
            newRide.pickup_lat,
            newRide.pickup_lng
          );
          
          // Only notify if ride is within radius
          if (distance <= radiusKm) {
            // Get passenger details
            const { data: passenger } = await supabase
              .from('profiles')
              .select('name, avatar')
              .eq('id', newRide.passenger_id)
              .single();
            
            callback({
              ...newRide,
              distance_to_pickup: distance,
              passenger
            });
          }
        } catch (error) {
          console.error('Error processing new ride request:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Calculate distance between two points in km using Haversine formula
 */
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
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
 * Complete ride and process payment
 */
export const completeRideAndProcessPayment = async (rideId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Get ride details
    const { ride, error: rideError } = await getRideDetails(rideId);
    
    if (rideError || !ride) throw new Error(rideError || "Ride not found");
    
    // Update ride status to completed
    const { error: updateError } = await supabase
      .from('rides')
      .update({ 
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', rideId);
    
    if (updateError) throw updateError;
    
    // Process payment if needed
    if (ride.payment_method === 'wallet') {
      // Transfer money from passenger to driver
      await processWalletPayment(
        ride.passenger_id,
        ride.driver_id,
        ride.price,
        rideId
      );
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Complete ride error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Process wallet payment between passenger and driver
 */
export const processWalletPayment = async (
  passengerId: string,
  driverId: string,
  amount: number,
  rideId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Get passenger and driver details
    const { data: passengerData } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', passengerId)
      .single();
      
    const { data: driverData } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', driverId)
      .single();
    
    // Calculate platform fee (20%)
    const platformFee = amount * 0.2;
    const driverAmount = amount - platformFee;
    
    // Start transaction - deduct from passenger
    const { error: deductError } = await supabase.rpc(
      'deduct_from_wallet',
      { user_id: passengerId, amount }
    );
    
    if (deductError) throw deductError;
    
    // Record passenger payment transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: passengerId,
        amount: -amount,
        type: 'ride_payment',
        status: 'completed',
        description: `Payment for ride to ${driverData?.name || 'Driver'}`,
        ride_id: rideId
      });
    
    // Add to driver wallet
    await supabase.rpc(
      'add_to_wallet',
      { user_id: driverId, amount: driverAmount }
    );
    
    // Record driver earning transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: driverId,
        amount: driverAmount,
        type: 'ride_earning',
        status: 'completed',
        description: `Earnings from ride for ${passengerData?.name || 'Passenger'}`,
        ride_id: rideId
      });
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Process wallet payment error:", error.message);
    return { success: false, error: error.message };
  }
};
