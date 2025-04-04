
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
      return mapDatabaseRideToRideObject(ride as RideRow);
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
      return mapDatabaseRideToRideObject(ride as RideRow);
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
  const pickupLocationJson = typeof ride.pickup_location === 'string' 
    ? JSON.parse(ride.pickup_location) 
    : ride.pickup_location as any;
    
  const pickupLocation: Location = {
    name: pickupLocationJson?.name || '',
    address: pickupLocationJson?.address || '',
    coordinates: pickupLocationJson?.coordinates || undefined
  };
  
  // Create dropoff location object
  const dropoffLocationJson = typeof ride.dropoff_location === 'string' 
    ? JSON.parse(ride.dropoff_location) 
    : ride.dropoff_location as any;
    
  const dropoffLocation: Location = {
    name: dropoffLocationJson?.name || '',
    address: dropoffLocationJson?.address || '',
    coordinates: dropoffLocationJson?.coordinates || undefined
  };
  
  // Create ride option object
  const rideOptionJson = typeof ride.ride_option === 'string' 
    ? JSON.parse(ride.ride_option) 
    : ride.ride_option as any;
    
  const rideOption: RideOption = {
    id: rideOptionJson?.id || '',
    name: rideOptionJson?.name || '',
    image: rideOptionJson?.image || '',
    price: ride.price,
    currency: ride.currency,
    duration: ride.duration,
    capacity: rideOptionJson?.capacity || 1
  };
  
  // Create driver object if available
  let driver: Driver | undefined = undefined;
  if (ride.driver_id) {
    driver = {
      id: ride.driver_id,
      name: "Driver", // Default name
      rating: 4.5, // Default rating
      licensePlate: "Unknown", // Default license plate
      avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png' // Default avatar
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

/**
 * Fetch user ride history (combines passenger and driver history)
 */
export const fetchUserRideHistory = async (userId: string): Promise<{ rides: Ride[]; error: string | null }> => {
  try {
    // Get passenger rides
    const { rides: passengerRides, error: passengerError } = await getPassengerRideHistory(userId);
    
    if (passengerError) {
      throw new Error(passengerError);
    }
    
    // Get driver rides
    const { rides: driverRides, error: driverError } = await getDriverRideHistory(userId);
    
    if (driverError) {
      throw new Error(driverError);
    }
    
    // Combine and sort by date
    const allRides = [...passengerRides, ...driverRides].sort((a, b) => {
      const dateA = a.startTime || a.endTime || new Date();
      const dateB = b.startTime || b.endTime || new Date();
      return dateB.getTime() - dateA.getTime();
    });
    
    return { rides: allRides, error: null };
  } catch (error: any) {
    console.error("Error fetching user ride history:", error.message);
    return { rides: [], error: error.message };
  }
};
