
import { supabase } from '@/integrations/supabase/client';

/**
 * Create a test ride for development purposes
 */
export async function createTestRide(userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // If no userId provided, get the first available user
    let actualUserId = userId;
    
    if (!actualUserId) {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      if (usersError) {
        console.error("Error getting user:", usersError);
        return { success: false, error: "No user found to create test ride" };
      }
      
      actualUserId = users?.id;
      
      if (!actualUserId) {
        return { success: false, error: "No user found to create test ride" };
      }
    }
    
    // Create test ride data
    const testRide = {
      passenger_id: actualUserId,
      pickup_location: { 
        name: "Test Pickup Location", 
        coordinates: [73.0479, 33.6844] // Islamabad coords
      },
      dropoff_location: {
        name: "Test Dropoff Location",
        coordinates: [73.0682, 33.7294] // A few km away
      },
      status: 'searching',
      price: 250,
      distance: 5.2,
      duration: 900, // 15 minutes in seconds
      ride_option: { name: 'Standard', type: 'car' },
      currency: 'RS',
      payment_method: 'cash'
    };
    
    console.log("Creating test ride:", testRide);
    
    // Insert the test ride
    const { data, error } = await supabase
      .from('rides')
      .insert(testRide)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating test ride:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating test ride:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a test ride using the Supabase Edge Function
 */
export async function createTestRideViaFunction(userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create_test_ride', {
      body: { userId }
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Edge function error:', error);
    return { success: false, error: error.message };
  }
}

export default createTestRide;
