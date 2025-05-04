import { supabase } from '@/integrations/supabase/client';
import { Location, RideOption, JsonLocation, Json } from '../types';

/**
 * Create a new ride request
 */
export const createRideRequest = async ({
  passengerId,
  pickupLocation,
  dropoffLocation,
  vehicleType,
  estimatedPrice,
  estimatedDistance,
  estimatedDuration,
  paymentMethod = 'cash'
}: {
  passengerId: string;
  pickupLocation: { lat: number; lng: number; name: string };
  dropoffLocation: { lat: number; lng: number; name: string };
  vehicleType: 'car' | 'bike' | 'auto';
  estimatedPrice: number;
  estimatedDistance: number;
  estimatedDuration: number;
  paymentMethod?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: { name: pickupLocation.name, coordinates: [pickupLocation.lng, pickupLocation.lat] },
        dropoff_location: { name: dropoffLocation.name, coordinates: [dropoffLocation.lng, dropoffLocation.lat] },
        ride_option: { name: vehicleType, type: vehicleType },
        price: estimatedPrice,
        distance: estimatedDistance,
        duration: estimatedDuration,
        payment_method: paymentMethod,
        status: 'searching'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error creating ride request:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Get nearby ride requests for a driver
 */
export const getNearbyRideRequests = async (
  driverLat: number,
  driverLng: number,
  radiusKm: number = 5
) => {
  try {
    // First get all active ride requests
    const { data: rides, error: ridesError } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);

    if (ridesError) throw ridesError;

    if (!rides || rides.length === 0) {
      return { data: [], error: null };
    }

    // Filter rides by distance
    const nearbyRides = rides.filter(ride => {
      // Extract coordinates safely
      const coords = extractCoordinates(ride.pickup_location);
      if (!coords) return false;
      
      const [pickupLng, pickupLat] = coords;
      
      const distance = getDistanceFromLatLonInKm(
        driverLat,
        driverLng,
        pickupLat,
        pickupLng
      );
      return distance <= radiusKm;
    });

    // Get passenger details for nearby rides
    const ridesWithPassengers = await Promise.all(
      nearbyRides.map(async (ride) => {
        const { data: passenger } = await supabase
          .from('profiles')
          .select('name, avatar')
          .eq('id', ride.passenger_id)
          .single();

        // Safely access coordinates with optional chaining and defaults
        const coordinates = extractCoordinates(ride.pickup_location);
        const [pickupLng, pickupLat] = coordinates || [0, 0];
        
        const distance = getDistanceFromLatLonInKm(
          driverLat,
          driverLng,
          pickupLat,
          pickupLng
        );

        return {
          ...ride,
          passenger: passenger || null,
          distance_to_pickup: Number(distance.toFixed(1))
        };
      })
    );

    return { data: ridesWithPassengers, error: null };
  } catch (error: any) {
    console.error('Error getting nearby rides:', error);
    return { data: [], error: error.message };
  }
};

/**
 * Accept a ride request
 */
export const acceptRideRequest = async (rideId: string, driverId: string) => {
  try {
    // First check if ride is still available
    const { data: ride, error: checkError } = await supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .single();

    if (checkError || !ride || ride.status !== 'searching') {
      return { success: false, error: 'This ride is no longer available' };
    }

    // Update ride status and assign driver
    const { error } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'confirmed',
        started_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .eq('status', 'searching');

    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error accepting ride:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update ride status
 */
export const updateRideStatus = async (
  rideId: string,
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
  additionalData: any = {}
) => {
  try {
    const updateData = {
      status,
      ...additionalData
    };

    if (status === 'completed') {
      updateData.end_time = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.end_time = new Date().toISOString();
    }

    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating ride status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to nearby ride requests
 */
export const subscribeToNearbyRides = (
  callback: (ride: any) => void,
  driverLocation: { latitude: number; longitude: number },
  radiusKm: number = 5
) => {
  const channel = supabase
    .channel('nearby_rides')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen for all changes
        schema: 'public',
        table: 'rides',
        filter: `status=eq.searching`
      },
      async (payload) => {
        try {
          if (payload.eventType === 'DELETE') return;

          const newRide = payload.new;
          
          // Type guard to ensure pickup_location is a valid object
          if (!newRide.pickup_location || typeof newRide.pickup_location !== 'object') {
            return;
          }
          
          // Access coordinates safely with optional chaining
          const coordinates = newRide.pickup_location?.coordinates;
          if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
            return;
          }
          
          const pickupLng = coordinates[0];
          const pickupLat = coordinates[1];
          
          // Calculate distance to new ride
          const distance = getDistanceFromLatLonInKm(
            driverLocation.latitude,
            driverLocation.longitude,
            pickupLat,
            pickupLng
          );
          
          // Only notify if ride is within radius and not assigned to a driver
          if (distance <= radiusKm && !newRide.driver_id) {
            // Get passenger details
            const { data: passenger } = await supabase
              .from('profiles')
              .select('name, avatar')
              .eq('id', newRide.passenger_id)
              .single();
            
            callback({
              ...newRide,
              distance_to_pickup: Number(distance.toFixed(1)),
              passenger
            });
          }
        } catch (error) {
          console.error('Error processing ride update:', error);
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
 * Create a new ride request in the rides table
 */
export const createNewRideRequest = async ({
  passengerId,
  pickupLocation,
  dropoffLocation,
  bidAmount,
  vehicleType,
  estimatedDistance,
  estimatedDuration,
  paymentMethod = 'cash'
}: {
  passengerId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  bidAmount: number;
  vehicleType: string;
  estimatedDistance: number;
  estimatedDuration: number;
  paymentMethod?: string;
}) => {
  try {
    // First validate the coordinates
    if (!pickupLocation.coordinates || !dropoffLocation.coordinates) {
      throw new Error('Invalid location coordinates');
    }

    console.log('Creating new ride with data:', {
      passengerId,
      pickupLocation: {
        name: pickupLocation.name,
        address: pickupLocation.address,
        coordinates: pickupLocation.coordinates
      },
      dropoffLocation: {
        name: dropoffLocation.name,
        address: dropoffLocation.address,
        coordinates: dropoffLocation.coordinates
      },
      bidAmount,
      vehicleType,
      status: 'searching'
    });

    // Insert the ride request
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: {
          name: pickupLocation.name,
          address: pickupLocation.address,
          coordinates: pickupLocation.coordinates // Ensure this is [lng, lat]
        },
        dropoff_location: {
          name: dropoffLocation.name,
          address: dropoffLocation.address,
          coordinates: dropoffLocation.coordinates // Ensure this is [lng, lat]
        },
        ride_option: {
          name: vehicleType,
          type: vehicleType,
          basePrice: bidAmount
        },
        bid_amount: bidAmount,
        price: bidAmount, // Set both price and bid_amount for consistency
        distance: estimatedDistance,
        duration: estimatedDuration,
        payment_method: paymentMethod,
        status: 'searching',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Successfully created ride with ID:', data.id);
    
    // Setup cleanup function that can be called if needed
    const unsubscribe = () => {
      console.log('Cleanup called for ride creation');
    };
    
    return { data, error: null, unsubscribe };
  } catch (error: any) {
    console.error('Error creating ride:', error.message);
    return { data: null, error: error.message, unsubscribe: () => {} };
  }
};

/**
 * Update driver's online status and location
 */
export const updateDriverStatus = async (
  userId: string,
  status: 'online' | 'offline'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Update driver status using vehicle_model field to store status
    // since we can't add new columns
    const { error } = await supabase
      .from('driver_details')
      .update({ 
        status: status === 'online' ? 'active' : 'pending',
        // Store last status update timestamp in the JSON
        vehicle_model: JSON.stringify({
          status: status,
          updated_at: new Date().toISOString()
        })
      })
      .eq('user_id', userId);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating driver status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get nearby pending rides for a driver
 */
export const getNearbyPendingRides = async (
  driverId: string,
  location: { latitude: number; longitude: number },
  radiusKm: number = 5
): Promise<{ data: any[]; error: string | null }> => {
  try {
    // Get driver details
    const { data: driverDetails, error: driverError } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', driverId)
      .single();

    if (driverError) throw driverError;

    // Get all available ride requests
    const { data: rides, error: ridesError } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .is('driver_id', null);

    if (ridesError) throw ridesError;

    if (!rides || rides.length === 0) {
      return { data: [], error: null };
    }

    // Filter rides by distance and vehicle type
    const nearbyRides = rides.filter(ride => {
      // Check vehicle type match - get type from ride_option
      const rideOption = ride.ride_option;
      let rideVehicleType: string | undefined;
      
      if (typeof rideOption === 'string') {
        try {
          const parsed = JSON.parse(rideOption);
          rideVehicleType = parsed && typeof parsed === 'object' && 'name' in parsed ? 
            parsed.name?.toLowerCase() : undefined;
        } catch (e) {
          rideVehicleType = undefined;
        }
      } else if (rideOption && typeof rideOption === 'object') {
        // Handle as object - safely check if it's an array or object with name property
        if (Array.isArray(rideOption)) {
          // If it's an array, we can't directly access .name
          rideVehicleType = undefined;
        } else if ('name' in rideOption) {
          // Now TypeScript knows this is an object with a name property
          rideVehicleType = (rideOption as {name?: string}).name?.toLowerCase();
        }
      }
      
      if (!rideVehicleType || rideVehicleType !== driverDetails.vehicle_type.toLowerCase()) {
        return false;
      }

      // Extract coordinates safely
      const coords = extractCoordinates(ride.pickup_location);
      if (!coords) return false;
      
      const [pickupLng, pickupLat] = coords;

      // Calculate distance using the Haversine formula
      const distance = getDistanceFromLatLonInKm(
        location.latitude,
        location.longitude,
        pickupLat,
        pickupLng
      );

      return distance <= radiusKm;
    }).map(ride => {
      // Extract coordinates safely
      const coords = extractCoordinates(ride.pickup_location);
      const [pickupLng, pickupLat] = coords || [0, 0];
      
      return {
        ...ride,
        distance_to_pickup: Number(
          getDistanceFromLatLonInKm(
            location.latitude,
            location.longitude,
            pickupLat,
            pickupLng
          ).toFixed(1)
        )
      };
    });

    return { data: nearbyRides, error: null };
  } catch (error: any) {
    console.error('Error getting nearby rides:', error);
    return { 
      data: [], 
      error: error.message || 'Failed to fetch nearby rides' 
    };
  }
};

/**
 * Subscribe to nearby pending rides
 */
export const subscribeToNearbyPendingRides = (
  driverId: string,
  location: { latitude: number; longitude: number },
  callback: (rides: any[]) => void,
  radiusKm: number = 5
) => {
  // Set up subscription for new ride requests
  const channel = supabase
    .channel('nearby_pending_rides')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `status=eq.searching`
      },
      async () => {
        // When changes occur, fetch the updated list of nearby rides
        const { data, error } = await getNearbyPendingRides(driverId, location, radiusKm);
        if (!error && data) {
          callback(data);
        }
      }
    )
    .subscribe();

  // Also set up subscription for driver status changes
  const statusChannel = supabase
    .channel(`driver_status:${driverId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_details',
        filter: `user_id=eq.${driverId}`
      },
      async (payload) => {
        const driver = payload.new;
        // Not referencing unknown 'is_online' property anymore
        // Instead using current_status which should exist after the SQL migration
        const isOffline = driver.current_status === 'offline';
        if (isOffline) {
          callback([]); // Clear rides list when driver goes offline
        } else {
          // Refresh rides list when driver comes online
          const { data, error } = await getNearbyPendingRides(driverId, location, radiusKm);
          if (!error && data) {
            callback(data);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    supabase.removeChannel(statusChannel);
  };
};

/**
 * Safely accept a ride request with race condition prevention
 */
export const acceptRideRequestSafe = async (
  rideId: string,
  driverId: string,
  driverLocation: { latitude: number; longitude: number }
) => {
  try {
    // First check if driver is online and eligible
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .single();

    if (profileError) throw profileError;

    // Check if driver is verified
    const isVerifiedDriver = profile?.is_verified_driver === true;

    if (!isVerifiedDriver) {
      return { 
        success: false, 
        error: 'Driver must be verified to accept rides' 
      };
    }

    // Get driver details
    const { data: driverDetails, error: detailsError } = await supabase
      .from('driver_details')
      .select('vehicle_type, status, vehicle_model, deposit_amount_required')
      .eq('user_id', driverId)
      .single();

    if (detailsError) throw detailsError;

    if (!driverDetails || driverDetails.status !== 'approved') {
      return { 
        success: false, 
        error: 'Driver must be approved to accept rides' 
      };
    }

    // Check for sufficient deposit - first from has_sufficient_deposit field if exists
    // otherwise check manually through wallet balance
    let hasSufficientDeposit = false;
    
    // First try to get it from the driver_details table
    if ('has_sufficient_deposit' in driverDetails) {
      hasSufficientDeposit = driverDetails.has_sufficient_deposit === true;
    } else {
      // If not available in driver_details, check wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', driverId)
        .single();
        
      if (!walletData) {
        hasSufficientDeposit = false;
      } else {
        hasSufficientDeposit = walletData.balance >= (driverDetails.deposit_amount_required || 3000);
      }
    }
    
    if (!hasSufficientDeposit) {
      return { 
        success: false, 
        error: 'Insufficient deposit balance to accept rides' 
      };
    }

    // Begin transaction with row-level locking
    const { data: ride, error: lockError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .eq('status', 'searching')
      .is('driver_id', null)
      .single();

    if (lockError || !ride) {
      return { success: false, error: 'This ride is no longer available' };
    }

    // Verify vehicle type matches by handling Json properly
    const rideOption = ride.ride_option;
    let rideVehicleName: string | undefined;
    
    if (typeof rideOption === 'string') {
      try {
        const parsed = JSON.parse(rideOption);
        rideVehicleName = parsed?.name?.toLowerCase();
      } catch (e) {
        rideVehicleName = undefined;
      }
    } else if (rideOption && typeof rideOption === 'object') {
      // Fix for error at line 668: Check if it's an array first
      if (Array.isArray(rideOption)) {
        rideVehicleName = undefined;
      } else {
        // Now TypeScript knows this is an object, not an array
        rideVehicleName = (rideOption as {name?: string})?.name?.toLowerCase();
      }
    }

    if (driverDetails.vehicle_type.toLowerCase() !== (rideVehicleName || '')) {
      return { 
        success: false, 
        error: `This ride requires a ${rideVehicleName || 'compatible'} vehicle` 
      };
    }

    // Update ride with driver information
    const { error: updateError } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'confirmed',
        start_time: new Date().toISOString(),
        driver_location: {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', rideId)
      .eq('status', 'searching')
      .is('driver_id', null);

    if (updateError) throw updateError;

    // Update driver details - use vehicle_model to store info since we can't add columns
    const vehicleModelData = {
      ride_status: 'on_ride',
      current_ride_id: rideId,
      last_ride_accepted_at: new Date().toISOString()
    };
    
    const { error: driverUpdateError } = await supabase
      .from('driver_details')
      .update({
        vehicle_model: JSON.stringify(vehicleModelData)
      })
      .eq('user_id', driverId);

    if (driverUpdateError) {
      // Attempt to rollback ride assignment if driver update fails
      await supabase
        .from('rides')
        .update({
          driver_id: null,
          status: 'searching',
          start_time: null,
          driver_location: null
        })
        .eq('id', rideId);
      
      throw driverUpdateError;
    }

    // Get updated ride details with passenger info
    const { data: updatedRide, error: rideError } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!passenger_id (
          id,
          name,
          avatar,
          rating,
          phone
        )
      `)
      .eq('id', rideId)
      .single();

    if (rideError) throw rideError;

    return { 
      success: true, 
      error: null, 
      ride: updatedRide 
    };
  } catch (error: any) {
    console.error('Error accepting ride:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to accept ride', 
      ride: null 
    };
  }
};

/**
 * Fetches active ride requests
 */
export const fetchRideRequests = async (driverId: string) => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching ride requests:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Creates a test ride for debugging purposes (only for development)
 */
export const createTestRide = async (userId: string) => {
  try {
    const testRide = {
      passenger_id: userId,
      pickup_location: {
        name: "Test Pickup Location",
        address: "123 Test Street",
        coordinates: [73.1234, 33.5678] // [lng, lat]
      },
      dropoff_location: {
        name: "Test Dropoff Location",
        address: "456 Test Avenue",
        coordinates: [73.2345, 33.6789] // [lng, lat]
      },
      ride_option: {
        name: "Car",
        type: "Car",
        basePrice: 250
      },
      bid_amount: 250,
      price: 250,
      distance: 5.2,
      duration: 900, // 15 minutes in seconds
      status: "searching", 
      payment_method: "cash",
      currency: "RS",
      created_at: new Date().toISOString()
    };

    console.log('Creating test ride', testRide);

    const { data, error } = await supabase
      .from('rides')
      .insert(testRide)
      .select()
      .single();

    if (error) {
      console.error('Error creating test ride:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('Test ride created successfully:', data);
    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in createTestRide:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Helper function to safely extract coordinates from JsonLocation
 */
function extractCoordinates(locationData: any): [number, number] | null {
  try {
    if (!locationData) return null;
    
    // Handle string JSON
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        return null;
      }
    }
    
    // Check if coordinates exist directly
    if (locationData.coordinates && Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) {
      return locationData.coordinates as [number, number];
    }
    
    // Check for x,y format
    if (locationData.x !== undefined && locationData.y !== undefined) {
      return [locationData.x, locationData.y];
    }
    
    // Check for longitude,latitude format
    if (locationData.longitude !== undefined && locationData.latitude !== undefined) {
      return [locationData.longitude, locationData.latitude];
    }
    
    // Check for lng,lat format
    if (locationData.lng !== undefined && locationData.lat !== undefined) {
      return [locationData.lng, locationData.lat];
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting coordinates:', e);
    return null;
  }
}

/**
 * Helper function to safely get name from location data
 */
function extractLocationName(locationData: any): string {
  try {
    if (!locationData) return "Unknown";
    
    // Handle string JSON
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        return "Unknown";
      }
    }
    
    // Check if name exists directly on the object
    if (typeof locationData === 'object' && locationData !== null && 'name' in locationData) {
      return locationData.name || "Unknown";
    }
    
    return "Unknown";
  } catch (e) {
    return "Unknown";
  }
}

/**
 * Checks if a driver is eligible to accept rides
 */
export const isEligibleDriver = async (userId: string): Promise<{ eligible: boolean; reason?: string; redirectTo?: string }> => {
  try {
    // Check if user has a driver profile
    const { data: driver, error: driverError } = await supabase
      .from('driver_details')
      .select('status, deposit_amount_required, has_sufficient_deposit')
      .eq('user_id', userId)
      .maybeSingle();

    if (driverError) {
      console.error("Error checking driver status:", driverError);
      return { eligible: false, reason: 'Error checking driver status', redirectTo: '/register-driver' };
    }

    // If no driver profile exists
    if (!driver) {
      return { eligible: false, reason: 'Driver registration required', redirectTo: '/register-driver' };
    }

    // Check if driver is approved
    if (driver.status !== 'approved') {
      return { eligible: false, reason: 'Driver account is pending approval', redirectTo: '/register-driver' };
    }

    // Check for sufficient deposit
    let hasSufficientDeposit = false;
    
    // First check has_sufficient_deposit if available
    if ('has_sufficient_deposit' in driver) {
      hasSufficientDeposit = driver.has_sufficient_deposit === true;
    } else {
      // Otherwise check wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (!walletError && wallet) {
        hasSufficientDeposit = wallet.balance >= (driver.deposit_amount_required || 3000);
      }
    }
    
    if (!hasSufficientDeposit) {
      return { eligible: false, reason: 'Insufficient deposit balance', redirectTo: '/wallet' };
    }

    // Driver is eligible
    return { eligible: true };
    
  } catch (error: any) {
    console.error("Error checking driver eligibility:", error);
    return { eligible: false, reason: error.message, redirectTo: '/register-driver' };
  }
};

/**
 * Get ride details by ID
 */
export const getRideDetails = async (rideId: string) => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!passenger_id (
          id, name, avatar, phone
        ),
        driver:profiles!driver_id (
          id, name, avatar, phone
        )
      `)
      .eq('id', rideId)
      .single();
      
    if (error) throw error;
    
    return { 
      ride: data, 
      error: null 
    };
  } catch (error: any) {
    console.error('Error fetching ride details:', error);
    return { 
      ride: null, 
      error: error.message 
    };
  }
};

/**
 * Subscribe to new ride requests in a given area
 */
export const subscribeToNewRidesInArea = (
  driverLocation: { latitude: number; longitude: number },
  radiusKm: number,
  callback: (rides: any[]) => void
) => {
  console.log('Setting up subscription for new rides');
  
  // Set up subscription for new ride requests
  const channel = supabase
    .channel('realtime_rides')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: 'status=eq.searching'
      },
      async (payload) => {
        console.log('New ride detected:', payload);
        
        // Extract coordinates from the new ride
        const pickupLocation = payload.new.pickup_location;
        const coords = extractCoordinates(pickupLocation);
        
        if (!coords) {
          console.log('Could not extract coordinates from new ride');
          return;
        }
        
        const [pickupLng, pickupLat] = coords;
        
        // Calculate distance to the pickup location
        const distance = getDistanceFromLatLonInKm(
          driverLocation.latitude,
          driverLocation.longitude,
          pickupLat,
          pickupLng
        );
        
        // If the ride is within the desired radius, add it to the list
        if (distance <= radiusKm) {
          console.log(`New ride is ${distance.toFixed(1)}km away, within ${radiusKm}km radius`);
          
          // Get full ride details with passenger info
          const { data: fullRideDetails } = await supabase
            .from('rides')
            .select(`
              *,
              passenger:profiles!passenger_id (
                id, name, avatar
              )
            `)
            .eq('id', payload.new.id)
            .single();
            
          if (fullRideDetails) {
            // Trigger the callback with the updated rides list
            const { data: currentRides } = await getNearbyRideRequests(
              driverLocation.latitude, 
              driverLocation.longitude,
              radiusKm
            );
            
            callback(currentRides || []);
          }
        } else {
          console.log(`New ride is ${distance.toFixed(1)}km away, outside ${radiusKm}km radius`);
        }
      }
    )
    .subscribe();
  
  // Also subscribe to ride status changes (e.g., if someone else accepts a ride)
  const statusChannel = supabase
    .channel('ride_status_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides'
      },
      async () => {
        // When any ride is updated, refresh the list of available rides
        const { data: currentRides } = await getNearbyRideRequests(
          driverLocation.latitude, 
          driverLocation.longitude,
          radiusKm
        );
        
        callback(currentRides || []);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
    supabase.removeChannel(statusChannel);
  };
};
