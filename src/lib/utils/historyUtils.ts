
import { supabase } from "@/integrations/supabase/client";
import { Location, Ride, Driver, RideOption, PaymentMethod } from "@/lib/types";

/**
 * Fetches ride history for a user (both as passenger and driver)
 */
export const fetchUserRideHistory = async (userId: string): Promise<{ rides: Ride[]; error: string | null }> => {
  try {
    // Fetch rides where user is a passenger
    const { data: passengerRides, error: passengerError } = await supabase
      .from('rides')
      .select(`
        *,
        driver:driver_id (
          id,
          name,
          avatar
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (passengerError) throw passengerError;
    
    // Fetch rides where user is a driver
    const { data: driverRides, error: driverError } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:passenger_id (
          id,
          name,
          avatar
        )
      `)
      .eq('driver_id', userId)
      .order('created_at', { ascending: false });
    
    if (driverError) throw driverError;
    
    // Combine and format rides
    const allRides = [...(passengerRides || []), ...(driverRides || [])];
    
    // Sort by created_at date
    allRides.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Map Supabase data to our Ride type
    const formattedRides: Ride[] = allRides.map(ride => {
      // Parse pickup location from JSON
      const pickup: Location = typeof ride.pickup_location === 'string'
        ? JSON.parse(ride.pickup_location)
        : ride.pickup_location as Location;
      
      // Parse dropoff location from JSON
      const dropoff: Location = typeof ride.dropoff_location === 'string'
        ? JSON.parse(ride.dropoff_location)
        : ride.dropoff_location as Location;
      
      // Parse ride option from JSON
      const rideOption: RideOption = typeof ride.ride_option === 'string'
        ? JSON.parse(ride.ride_option)
        : ride.ride_option as RideOption;
      
      // Create driver object if driver info exists
      let driver: Driver | undefined;
      if (ride.driver) {
        driver = {
          id: ride.driver.id,
          name: ride.driver.name,
          rating: 4.8, // Default rating if not available
          licensePlate: "Unknown", // Default value if not available
          avatar: ride.driver.avatar || "",
        };
      }
      
      // Parse dates
      const startTime = ride.start_time ? new Date(ride.start_time) : undefined;
      const endTime = ride.end_time ? new Date(ride.end_time) : undefined;
      
      // Create Ride object
      return {
        id: ride.id,
        pickup,
        dropoff,
        rideOption,
        driver,
        status: ride.status,
        price: ride.price,
        currency: ride.currency,
        distance: ride.distance,
        duration: ride.duration,
        startTime,
        endTime,
        paymentMethod: ride.payment_method as PaymentMethod,
      };
    });
    
    return { rides: formattedRides, error: null };
  } catch (error: any) {
    console.error("History fetch error:", error.message);
    return { rides: [], error: error.message };
  }
};

/**
 * Fetches detailed information for a specific ride
 */
export const fetchRideDetails = async (rideId: string): Promise<{ ride: Ride | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:driver_id (
          id,
          name,
          avatar
        ),
        passenger:passenger_id (
          id,
          name,
          avatar
        )
      `)
      .eq('id', rideId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return { ride: null, error: "Ride not found" };
    }
    
    // Parse pickup location from JSON
    const pickup: Location = typeof data.pickup_location === 'string'
      ? JSON.parse(data.pickup_location)
      : data.pickup_location as Location;
    
    // Parse dropoff location from JSON
    const dropoff: Location = typeof data.dropoff_location === 'string'
      ? JSON.parse(data.dropoff_location)
      : data.dropoff_location as Location;
    
    // Parse ride option from JSON
    const rideOption: RideOption = typeof data.ride_option === 'string'
      ? JSON.parse(data.ride_option)
      : data.ride_option as RideOption;
    
    // Create driver object if driver info exists
    let driver: Driver | undefined;
    if (data.driver) {
      driver = {
        id: data.driver.id,
        name: data.driver.name,
        rating: 4.8, // Default rating if not available
        licensePlate: "Unknown", // Default value if not available
        avatar: data.driver.avatar || "",
      };
    }
    
    // Parse dates
    const startTime = data.start_time ? new Date(data.start_time) : undefined;
    const endTime = data.end_time ? new Date(data.end_time) : undefined;
    
    // Create Ride object
    const ride: Ride = {
      id: data.id,
      pickup,
      dropoff,
      rideOption,
      driver,
      status: data.status,
      price: data.price,
      currency: data.currency,
      distance: data.distance,
      duration: data.duration,
      startTime,
      endTime,
      paymentMethod: data.payment_method as PaymentMethod,
    };
    
    return { ride, error: null };
  } catch (error: any) {
    console.error("Ride details error:", error.message);
    return { ride: null, error: error.message };
  }
};
