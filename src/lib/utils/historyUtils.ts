
import { supabase } from "@/integrations/supabase/client";
import { Ride, Location, RideOption, Driver } from '@/lib/types';
import { Database } from "@/integrations/supabase/types";

type RideRow = Database['public']['Tables']['rides']['Row'];

/**
 * Gets passenger ride history
 */
export const getPassengerRideHistory = async (userId: string): Promise<{ rides: Ride[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { rides: [], error: null };
    }
    
    // Convert database records to Ride objects
    const rides: Ride[] = data.map(ride => {
      // Sort rides by most recent first
      return mapDatabaseRideToRideObject(ride);
    });
    
    return { rides, error: null };
  } catch (error: any) {
    console.error("Get passenger ride history error:", error.message);
    return { rides: [], error: error.message };
  }
};

/**
 * Gets driver ride history
 */
export const getDriverRideHistory = async (userId: string): Promise<{ rides: Ride[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { rides: [], error: null };
    }
    
    // Convert database records to Ride objects
    const rides: Ride[] = data.map(ride => {
      return mapDatabaseRideToRideObject(ride);
    });
    
    return { rides, error: null };
  } catch (error: any) {
    console.error("Get driver ride history error:", error.message);
    return { rides: [], error: error.message };
  }
};

/**
 * Maps a database ride record to a Ride object
 */
const mapDatabaseRideToRideObject = (ride: RideRow): Ride => {
  // Create pickup location object
  const pickupLocation: Location = {
    name: ride.pickup_location.name,
    address: ride.pickup_location.address,
    coordinates: ride.pickup_location.coordinates
  };
  
  // Create dropoff location object
  const dropoffLocation: Location = {
    name: ride.dropoff_location.name,
    address: ride.dropoff_location.address,
    coordinates: ride.dropoff_location.coordinates
  };
  
  // Create ride option object
  const rideOption: RideOption = {
    id: ride.ride_option.id,
    name: ride.ride_option.name,
    image: ride.ride_option.image,
    price: ride.price, // Use the actual price paid
    currency: ride.currency,
    duration: ride.duration,
    capacity: ride.ride_option.capacity
  };
  
  // Create driver object if available
  let driver: Driver | undefined = undefined;
  if (ride.driver) {
    driver = {
      id: ride.driver.id,
      name: ride.driver.name,
      rating: ride.driver.rating,
      licensePlate: ride.driver.licensePlate,
      avatar: ride.driver.avatar
    };
  }
  
  // Create ride object
  const rideObject: Ride = {
    id: ride.id,
    pickup: pickupLocation,
    dropoff: dropoffLocation,
    rideOption: rideOption,
    driver: driver,
    status: ride.status as "searching" | "confirmed" | "in_progress" | "completed" | "cancelled",
    price: ride.price,
    currency: ride.currency,
    distance: ride.distance,
    duration: ride.duration,
    startTime: ride.start_time ? new Date(ride.start_time) : undefined,
    endTime: ride.end_time ? new Date(ride.end_time) : undefined,
    paymentMethod: ride.payment_method as "cash" | "wallet"
  };
  
  return rideObject;
};

/**
 * Subscribes to ride history updates
 */
export const subscribeToRideHistory = (
  userId: string, 
  isDriver: boolean,
  callback: (rides: Ride[]) => void
) => {
  const userField = isDriver ? 'driver_id' : 'passenger_id';
  
  const channel = supabase
    .channel(`ride_history:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen for all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'rides',
        filter: `${userField}=eq.${userId}`
      },
      () => {
        // When a change is detected, fetch the updated history
        if (isDriver) {
          getDriverRideHistory(userId)
            .then(({ rides }) => callback(rides));
        } else {
          getPassengerRideHistory(userId)
            .then(({ rides }) => callback(rides));
        }
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
