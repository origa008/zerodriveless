
import { supabase } from "@/integrations/supabase/client";

/**
 * Create a test ride via the Edge Function
 */
export async function createTestRideViaFunction(userId: string | undefined): Promise<{ success: boolean, rideId?: string, error?: string }> {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }
    
    console.log("Calling create_test_ride function with user ID:", userId);
    
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke("create_test_ride", {
      method: "POST",
      body: { userId },
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      console.error("Function returned error:", data?.error);
      return { success: false, error: data?.error || "Unknown error" };
    }
    
    console.log("Test ride created successfully:", data?.rideId);
    return { success: true, rideId: data?.rideId };
    
  } catch (err: any) {
    console.error("Error creating test ride:", err);
    return { success: false, error: err.message };
  }
}
