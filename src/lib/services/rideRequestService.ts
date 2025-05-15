
import { supabase } from '@/integrations/supabase/client';
import { processRideData } from '@/lib/utils/rideProcessingUtils';

/**
 * Fetch ride requests from the database based on driver location
 * @param driverId - The ID of the driver
 * @param coordinates - The current coordinates of the driver [longitude, latitude]
 * @param maxDistance - Maximum distance in kilometers (default: 2km)
 */
export async function fetchRideRequests(
  driverId: string | undefined,
  coordinates: [number, number] | null,
  maxDistance: number = 2 // Set default to 2km
) {
  try {
    // Basic validation checks
    if (!driverId) {
      throw new Error("Driver ID is missing. Please sign in again.");
    }

    if (!coordinates) {
      throw new Error("Unable to get your location. Please enable location services.");
    }
    
    console.log(`Fetching ride requests near [${coordinates[0]}, ${coordinates[1]}] within ${maxDistance}km radius`);
    
    // Get driver details to check eligibility first
    const { data: driverDetails, error: driverError } = await supabase
      .from('driver_details')
      .select('status, has_sufficient_deposit')
      .eq('user_id', driverId)
      .maybeSingle();
      
    if (driverError) {
      console.error("Error checking driver status:", driverError);
      throw new Error("Error checking driver status. Please try again.");
    }
    
    // Check if driver is eligible to see ride requests
    if (!driverDetails) {
      throw new Error("You are not registered as a driver.");
    }
    
    if (driverDetails.status !== 'approved') {
      throw new Error("Your driver application is pending approval.");
    }
    
    if (!driverDetails.has_sufficient_deposit) {
      throw new Error("You need to add the required deposit to your wallet.");
    }
    
    // Now get available rides that match the driver's criteria
    // Directly query for 'searching' rides without driver assigned
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!passenger_id (
          id, name, avatar
        )
      `)
      .eq('status', 'searching')
      .is('driver_id', null);
    
    if (error) {
      console.error("Error fetching ride requests:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No ride requests found");
      return [];
    }
    
    console.log(`Found ${data.length} rides in searching status`);
    
    // Process the ride data and filter by distance
    return processRideData(data, coordinates, maxDistance);
  } catch (err: any) {
    console.error('Error fetching ride requests:', err);
    throw err;
  }
}

/**
 * Set up a real-time subscription for ride requests
 */
export function subscribeToRideRequests(onUpdate: () => void) {
  console.log("Setting up real-time subscription for rides");
  
  // Set up real-time subscription - will trigger when any ride in searching status changes
  const channel = supabase
    .channel('ride_requests_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: "status=eq.searching"
      },
      (payload) => {
        console.log('Received real-time ride update:', payload);
        onUpdate();
      }
    )
    .subscribe(status => {
      console.log('Ride requests subscription status:', status);
    });
    
  return channel;
}
