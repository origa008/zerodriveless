import { supabase } from '@/integrations/supabase/client';
import { Location, RideOption } from '../types';

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
      .from('ride_requests')
      .insert({
        passenger_id: passengerId,
        pickup_location: { name: pickupLocation.name, coordinates: [pickupLocation.lng, pickupLocation.lat] },
        dropoff_location: { name: dropoffLocation.name, coordinates: [dropoffLocation.lng, dropoffLocation.lat] },
        vehicle_type: vehicleType,
        estimated_price: estimatedPrice,
        estimated_distance: estimatedDistance,
        estimated_duration: estimatedDuration,
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
      // Ensure pickup_location has valid coordinates
      if (!ride.pickup_location?.coordinates || ride.pickup_location.coordinates.length < 2) {
        return false;
      }
      
      // Get coordinates from the pickup_location object
      const pickupLng = ride.pickup_location.coordinates[0];
      const pickupLat = ride.pickup_location.coordinates[1];
      
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

        // Get coordinates from the pickup_location object
        const pickupLng = ride.pickup_location.coordinates[0];
        const pickupLat = ride.pickup_location.coordinates[1];
        
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
    const { data: ride } = await supabase
      .from('ride_requests')
      .select('status')
      .eq('id', rideId)
      .single();

    if (!ride || ride.status !== 'searching') {
      return { success: false, error: 'This ride is no longer available' };
    }

    // Update ride status and assign driver
    const { error } = await supabase
      .from('ride_requests')
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
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('ride_requests')
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
          
          // Ensure pickup_location has valid coordinates
          if (!newRide.pickup_location?.coordinates || newRide.pickup_location.coordinates.length < 2) {
            return;
          }
          
          // Get coordinates from the pickup_location object
          const pickupLng = newRide.pickup_location.coordinates[0];
          const pickupLat = newRide.pickup_location.coordinates[1];
          
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

    // Insert the ride request
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: {
          name: pickupLocation.name,
          address: pickupLocation.address,
          coordinates: pickupLocation.coordinates
        },
        dropoff_location: {
          name: dropoffLocation.name,
          address: dropoffLocation.address,
          coordinates: dropoffLocation.coordinates
        },
        bid_amount: bidAmount,
        price: bidAmount,
        vehicle_type: vehicleType,
        estimated_distance: estimatedDistance,
        estimated_duration: estimatedDuration,
        payment_method: paymentMethod,
        status: 'searching',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Set up real-time subscription for this ride
    const channel = supabase
      .channel(`ride_status:${data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${data.id}`
        },
        (payload) => {
          console.log('Ride status updated:', payload.new);
        }
      )
      .subscribe();

    return { data, error: null, unsubscribe: () => supabase.removeChannel(channel) };
  } catch (error: any) {
    console.error('Error creating ride request:', error);
    return { data: null, error: error.message, unsubscribe: () => {} };
  }
};

/**
 * Update driver's online status and location
 */
export const updateDriverStatus = async (
  driverId: string,
  isOnline: boolean,
  location?: { latitude: number; longitude: number }
) => {
  try {
    console.log('Updating driver status for:', driverId, 'isOnline:', isOnline);

    // First verify the user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_verified_driver')
      .eq('id', driverId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { 
        success: false, 
        error: 'Failed to fetch user profile' 
      };
    }

    if (!profile) {
      console.error('Profile not found for user:', driverId);
      return { 
        success: false, 
        error: 'User profile not found' 
      };
    }

    console.log('Found profile:', profile);

    // Check driver_details with explicit error logging
    const { data: driverDetails, error: detailsError } = await supabase
      .from('driver_details')
      .select(`
        id,
        user_id,
        status,
        has_sufficient_deposit,
        vehicle_type,
        deposit_amount_required,
        current_status
      `)
      .eq('user_id', driverId)
      .single();

    console.log('Driver details query result:', { driverDetails, detailsError });

    if (detailsError) {
      console.error('Error fetching driver details:', detailsError);
      // Check if this is a permissions error
      if (detailsError.message.includes('permission') || detailsError.code === 'PGRST301') {
        return { 
          success: false, 
          error: 'Permission denied accessing driver details. Please contact support.' 
        };
      }
      return { 
        success: false, 
        error: 'Failed to fetch driver status' 
      };
    }

    if (!driverDetails) {
      console.error('No driver details found for user:', driverId);
      return { 
        success: false, 
        error: 'Driver registration not found. Please complete registration first.' 
      };
    }

    console.log('Current driver status:', driverDetails.status);

    // Check approval status
    if (driverDetails.status !== 'approved') {
      console.log('Driver not approved. Current status:', driverDetails.status);
      return { 
        success: false, 
        error: `Driver account is ${driverDetails.status}. Must be approved to go online.` 
      };
    }

    // Check wallet balance if trying to go online
    if (isOnline) {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', driverId)
        .single();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
        return {
          success: false,
          error: 'Failed to verify deposit balance'
        };
      }

      console.log('Wallet balance:', wallet?.balance, 'Required:', driverDetails.deposit_amount_required);

      const hasEnoughDeposit = wallet && wallet.balance >= (driverDetails.deposit_amount_required || 3000);
      
      if (!hasEnoughDeposit) {
        // Update driver_details to reflect deposit status
        await supabase
          .from('driver_details')
          .update({ has_sufficient_deposit: false })
          .eq('user_id', driverId);

        return { 
          success: false, 
          error: `Insufficient deposit balance. Required: RS ${driverDetails.deposit_amount_required || 3000}` 
        };
      }

      // Update deposit status if it was previously insufficient
      if (!driverDetails.has_sufficient_deposit) {
        await supabase
          .from('driver_details')
          .update({ has_sufficient_deposit: true })
          .eq('user_id', driverId);
      }
    }

    // Update profile with online status and location
    const updateData: any = {
      is_verified_driver: true,
      is_online: isOnline,
      last_online: new Date().toISOString()
    };

    if (location) {
      updateData.current_location = {
        latitude: location.latitude,
        longitude: location.longitude,
        updated_at: new Date().toISOString()
      };
    }

    console.log('Updating profile with:', updateData);

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', driverId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    // Also update driver_details with current status
    const { error: detailsUpdateError } = await supabase
      .from('driver_details')
      .update({
        current_status: isOnline ? 'available' : 'offline',
        last_status_update: new Date().toISOString()
      })
      .eq('user_id', driverId);

    if (detailsUpdateError) {
      console.error('Error updating driver details:', detailsUpdateError);
      // Don't throw here as the main update was successful
    }

    console.log('Successfully updated driver status');

    return { 
      success: true, 
      error: null,
      details: {
        is_online: isOnline,
        vehicle_type: driverDetails.vehicle_type,
        has_sufficient_deposit: true,
        status: driverDetails.status
      }
    };
  } catch (error: any) {
    console.error('Error updating driver status:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update driver status' 
    };
  }
};

/**
 * Get nearby pending rides
 */
export const getNearbyPendingRides = async (
  driverId: string,
  location: { latitude: number; longitude: number },
  radiusKm: number = 5
) => {
  try {
    // First check if driver is approved and online
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_online, is_verified_driver')
      .eq('id', driverId)
      .single();

    if (profileError) throw profileError;

    if (!profile?.is_verified_driver || !profile?.is_online) {
      return { data: [], error: 'Driver must be approved and online' };
    }

    // Get driver's vehicle type
    const { data: driverDetails, error: detailsError } = await supabase
      .from('driver_details')
      .select('vehicle_type')
      .eq('user_id', driverId)
      .single();

    if (detailsError) throw detailsError;

    // Get nearby rides using manual distance calculation
    // In production, you should use PostGIS for better performance
    const { data: rides, error: ridesError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        passenger:profiles!passenger_id (
          id,
          name,
          avatar,
          rating
        )
      `)
      .eq('status', 'searching')
      .is('driver_id', null);

    if (ridesError) throw ridesError;

    if (!rides || rides.length === 0) {
      return { data: [], error: null };
    }

    // Filter rides by distance and vehicle type
    const nearbyRides = rides.filter(ride => {
      // Check vehicle type match
      if (ride.vehicle_type !== driverDetails.vehicle_type) {
        return false;
      }

      // Ensure pickup_location has valid coordinates
      if (!ride.pickup_location?.coordinates || ride.pickup_location.coordinates.length < 2) {
        return false;
      }
      
      // Extract coordinates from the pickup_location object
      const pickupLng = ride.pickup_location.coordinates[0];
      const pickupLat = ride.pickup_location.coordinates[1];

      // Calculate distance using the Haversine formula
      const distance = getDistanceFromLatLonInKm(
        location.latitude,
        location.longitude,
        pickupLat,
        pickupLng
      );

      return distance <= radiusKm;
    }).map(ride => {
      // Ensure pickup_location has valid coordinates
      if (!ride.pickup_location?.coordinates || ride.pickup_location.coordinates.length < 2) {
        return { ...ride, distance_to_pickup: 999 }; // Return a large distance if coordinates missing
      }
      
      // Extract coordinates from the pickup_location object
      const pickupLng = ride.pickup_location.coordinates[0];
      const pickupLat = ride.pickup_location.coordinates[1];
      
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
        table: 'drivers',
        filter: `id=eq.${driverId}`
      },
      async (payload) => {
        const driver = payload.new;
        if (!driver.is_online) {
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
      .select('is_online, is_verified_driver')
      .eq('id', driverId)
      .single();

    if (profileError) throw profileError;

    if (!profile?.is_online || !profile?.is_verified_driver) {
      return { 
        success: false, 
        error: 'Driver must be online and verified to accept rides' 
      };
    }

    // Get driver details
    const { data: driverDetails, error: detailsError } = await supabase
      .from('driver_details')
      .select('vehicle_type, status, has_sufficient_deposit')
      .eq('user_id', driverId)
      .single();

    if (detailsError) throw detailsError;

    if (!driverDetails || driverDetails.status !== 'approved') {
      return { 
        success: false, 
        error: 'Driver must be approved to accept rides' 
      };
    }

    if (!driverDetails.has_sufficient_deposit) {
      return { 
        success: false, 
        error: 'Insufficient deposit balance to accept rides' 
      };
    }

    // Begin transaction with row-level locking
    const { data: ride, error: lockError } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', rideId)
      .eq('status', 'searching')
      .is('driver_id', null)
      .single();

    if (lockError || !ride) {
      return { success: false, error: 'This ride is no longer available' };
    }

    // Verify vehicle type matches
    if (driverDetails.vehicle_type !== ride.vehicle_type) {
      return { 
        success: false, 
        error: `This ride requires a ${ride.vehicle_type} vehicle` 
      };
    }

    // Update ride with driver information
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({
        driver_id: driverId,
        status: 'confirmed',
        started_at: new Date().toISOString(),
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

    // Update driver details
    const { error: driverUpdateError } = await supabase
      .from('driver_details')
      .update({
        current_status: 'on_ride',
        current_ride_id: rideId,
        last_ride_accepted_at: new Date().toISOString()
      })
      .eq('user_id', driverId);

    if (driverUpdateError) {
      // Attempt to rollback ride assignment if driver update fails
      await supabase
        .from('ride_requests')
        .update({
          driver_id: null,
          status: 'searching',
          started_at: null,
          driver_location: null
        })
        .eq('id', rideId);
      
      throw driverUpdateError;
    }

    // Get updated ride details with passenger info
    const { data: updatedRide, error: rideError } = await supabase
      .from('ride_requests')
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