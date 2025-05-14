
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
    
    // Use maybeSingle to avoid errors when no record exists
    const { data, error } = await supabase
      .from('driver_details')
      .select('status, has_sufficient_deposit, deposit_amount_required')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking driver eligibility:", error);
      return { 
        eligible: false,
        reason: "Error checking driver status",
        redirectTo: "/official-driver"
      };
    }
    
    // If no driver record exists, they need to register
    if (!data) {
      return { 
        eligible: false,
        reason: "You need to register as a driver first",
        redirectTo: "/official-driver"
      };
    }
    
    console.log("Driver data found:", data);
    
    // If not approved, pending review
    if (data.status !== 'approved') {
      return {
        eligible: false,
        reason: "Your driver application is pending approval",
        redirectTo: "/official-driver"
      };
    }
    
    // If approved but doesn't have sufficient deposit
    if (!data.has_sufficient_deposit) {
      const requiredAmount = data.deposit_amount_required || 3000;
      return {
        eligible: false,
        reason: `You need to deposit at least ${requiredAmount} to your wallet`,
        redirectTo: "/wallet"
      };
    }
    
    // All checks passed
    return { eligible: true };
  } catch (err) {
    console.error("Exception checking driver eligibility:", err);
    return { 
      eligible: false,
      reason: "An error occurred checking your driver status",
      redirectTo: "/official-driver"
    };
  }
}
