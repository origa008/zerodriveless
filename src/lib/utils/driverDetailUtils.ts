
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches driver details from the driver_details table for a specific user
 */
export async function getDriverDetails(userId: string) {
  try {
    console.log("Fetching driver details for user:", userId);
    
    const { data, error } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching driver details:", error);
      return null;
    }
    
    console.log("Driver details fetched:", data);
    return data;
  } catch (err) {
    console.error("Exception fetching driver details:", err);
    return null;
  }
}

/**
 * Checks if a user is registered as a driver
 */
export async function isRegisteredDriver(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('driver_details')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error checking driver registration:", error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (err) {
    console.error("Exception checking driver registration:", err);
    return false;
  }
}
