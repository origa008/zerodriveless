
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches driver details from the driver_details table for a specific user
 */
export async function getDriverDetails(userId: string) {
  try {
    console.log("Fetching driver details for user:", userId);
    
    // Use auth.uid() directly in the query without recursive references
    const { data, error } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
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
    const { data, error } = await supabase
      .from('driver_details')
      .select('status, has_sufficient_deposit')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking driver registration:", error);
      return false;
    }
    
    // Driver is registered if they have a record and are approved with sufficient deposit
    return data?.status === 'approved' && data?.has_sufficient_deposit === true;
  } catch (err) {
    console.error("Exception checking driver registration:", err);
    return false;
  }
}

/**
 * Checks if a user is eligible to be a driver and returns detailed info
 */
export async function isEligibleDriver(userId: string): Promise<{ 
  eligible: boolean; 
  reason?: string;
  redirectTo?: string;
}> {
  try {
    console.log("Checking driver eligibility for userId:", userId);
    
    // Use a direct query without references that might cause recursion
    const { data, error } = await supabase.rpc('get_driver_eligibility', { user_id: userId });
    
    // If the RPC function fails or isn't available, fall back to direct query
    if (error) {
      console.log("RPC not available, using direct query instead:", error);
      
      // Use maybeSingle to avoid errors when no record exists
      const { data: driverData, error: driverError } = await supabase
        .from('driver_details')
        .select('status, has_sufficient_deposit, deposit_amount_required')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (driverError) {
        console.error("Error checking driver eligibility:", driverError);
        return { 
          eligible: false,
          reason: "Error checking driver status",
          redirectTo: "/official-driver"
        };
      }
      
      // If no driver record exists, they need to register
      if (!driverData) {
        return { 
          eligible: false,
          reason: "You need to register as a driver first",
          redirectTo: "/official-driver"
        };
      }
      
      // If not approved, pending review
      if (driverData.status !== 'approved') {
        return {
          eligible: false,
          reason: "Your driver application is pending approval",
          redirectTo: "/official-driver"
        };
      }
      
      // If approved but doesn't have sufficient deposit
      if (!driverData.has_sufficient_deposit) {
        const requiredAmount = driverData.deposit_amount_required || 3000;
        return {
          eligible: false,
          reason: `You need to deposit at least ${requiredAmount} to your wallet`,
          redirectTo: "/wallet"
        };
      }
      
      // All checks passed
      return { eligible: true };
    }
    
    // If RPC call is successful, return its results
    return { 
      eligible: data.eligible,
      reason: data.reason,
      redirectTo: data.redirect_to
    };
  } catch (err) {
    console.error("Exception checking driver eligibility:", err);
    return { 
      eligible: false,
      reason: "An error occurred checking your driver status",
      redirectTo: "/official-driver"
    };
  }
}
