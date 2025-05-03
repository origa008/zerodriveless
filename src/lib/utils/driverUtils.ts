import { supabase } from "@/integrations/supabase/client";
import { DriverDocument } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";

type DriverDetailRow = Database['public']['Tables']['driver_details']['Row'];
type DriverDetailInsert = Database['public']['Tables']['driver_details']['Insert'];

/**
 * Uploads a driver document to storage
 */
export const uploadDriverDocument = async (
  userId: string,
  file: File,
  documentType: string,
  userEmail?: string
): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Ensure storage bucket exists (or it will be created via SQL migration)
    console.log(`Uploading ${documentType} for user ${userId}`);
    
    // Get user email from session if not provided
    let email = userEmail;
    if (!email) {
      email = (await supabase.auth.getUser()).data.user?.email || '';
    }
    
    // Create a unique filename with user identifiers
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `${userId}_${documentType}_${timestamp}.${fileExtension}`;
    
    // Upload file to storage bucket
    console.log("Uploading document to bucket:", filename);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('driver_documents')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('driver_documents')
      .getPublicUrl(filename);
    
    if (!urlData.publicUrl) {
      throw new Error("Failed to get public URL");
    }
    
    console.log("Document uploaded successfully:", urlData.publicUrl);
    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error("Document upload error:", error.message);
    return { url: null, error: error.message };
  }
};

/**
 * Submits driver registration application
 */
export const submitDriverRegistration = async (
  userId: string,
  documentUrls: Record<string, string>,
  details: {
    fullName: string;
    cnicNumber: string;
    vehicleRegistrationNumber: string;
    vehicleType: string;
    vehicleModel?: string;
    vehicleColor?: string;
    driverLicenseNumber?: string;
    email?: string;
  }
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log("Submitting driver registration for user:", userId);
    console.log("Document URLs:", documentUrls);
    
    // Get user email from session if not provided in details
    const userEmail = details.email || (await supabase.auth.getUser()).data.user?.email || '';
    
    // Create driver details object using type-safe approach
    const driverDetails: Omit<DriverDetailInsert, 'email'> = {
      user_id: userId,
      full_name: details.fullName,
      cnic_number: details.cnicNumber,
      vehicle_registration_number: details.vehicleRegistrationNumber,
      vehicle_type: details.vehicleType,
      vehicle_model: details.vehicleModel,
      vehicle_color: details.vehicleColor,
      driver_license_number: details.driverLicenseNumber,
      status: 'pending',
      cnic_front_url: documentUrls.cnicFront,
      cnic_back_url: documentUrls.cnicBack,
      license_front_url: documentUrls.licenseFront,
      license_back_url: documentUrls.licenseBack,
      vehicle_registration_url: documentUrls.vehicleRegistration,
      vehicle_photo_url: documentUrls.vehiclePhoto,
      selfie_with_cnic_url: documentUrls.selfieWithCNIC,
      selfie_photo_url: documentUrls.selfiePhoto
    };
    
    // Use a separate insertion object to include email
    const insertData = {
      ...driverDetails,
      email: userEmail
    };
    
    // Check if an application already exists
    const { data: existingApp, error: checkError } = await supabase
      .from('driver_details')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    let error;
    if (existingApp) {
      // Update existing application
      console.log("Updating existing application:", existingApp.id);
      const { error: updateError } = await supabase
        .from('driver_details')
        .update(insertData)
        .eq('id', existingApp.id);
        
      error = updateError;
    } else {
      // Create new application
      console.log("Creating new driver application");
      const { error: insertError } = await supabase
        .from('driver_details')
        .insert(insertData);
        
      error = insertError;
    }
    
    if (error) throw error;
    
    // Update user profile to mark them as having applied
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_verified_driver: false })
      .eq('id', userId);
      
    if (profileError) console.error("Error updating profile:", profileError);
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Driver registration error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Gets driver application status
 */
export const getDriverRegistrationStatus = async (userId: string): Promise<{ 
  status: string | null; 
  isApproved: boolean;
  details: Partial<DriverDetailRow> | null;
  error: string | null 
}> => {
  try {
    console.log("Checking driver status for user:", userId);
    
    // Query with explicit type for database response
    const { data, error } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      console.log("No driver application found");
      return { status: null, isApproved: false, details: null, error: null };
    }
    
    console.log("Driver application found, status:", data.status);
    console.log("Deposit status:", data.has_sufficient_deposit);
    
    // Check if the user's wallet balance meets the deposit requirement
    if (data.status === 'approved') {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
        
      const hasSufficientDeposit = (walletData && walletData.balance >= data.deposit_amount_required);
      
      // Update the has_sufficient_deposit flag if it's changed
      if (hasSufficientDeposit !== data.has_sufficient_deposit) {
        console.log(`Updating deposit status from ${data.has_sufficient_deposit} to ${hasSufficientDeposit}`);
        
        // Update the has_sufficient_deposit flag
        await supabase
          .from('driver_details')
          .update({ has_sufficient_deposit: hasSufficientDeposit })
          .eq('user_id', userId);
          
        data.has_sufficient_deposit = hasSufficientDeposit;
      }
    }
    
    // If status is approved, update the user profile
    if (data.status === 'approved') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified_driver: true })
        .eq('id', userId);
        
      if (profileError) console.error("Error updating profile:", profileError);
    }
    
    return { 
      status: data.status, 
      isApproved: data.status === 'approved' && data.has_sufficient_deposit,
      details: data, 
      error: null 
    };
  } catch (error: any) {
    console.error("Get driver registration status error:", error.message);
    return { status: null, isApproved: false, details: null, error: error.message };
  }
};

/**
 * Subscribes to driver registration status changes
 */
export const subscribeToDriverRegistration = (
  userId: string,
  callback: (status: string) => void
) => {
  // Subscribe to both status and deposit changes
  const channel = supabase
    .channel('driver_details_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'driver_details',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const updatedData = payload.new as any;
        callback(updatedData.status);
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Gets all available driver requests near user
 */
export const getAvailableDrivers = async (email?: string): Promise<{ 
  drivers: any[]; 
  error: string | null 
}> => {
  try {
    let query = supabase
      .from('driver_details')
      .select('*')
      .eq('status', 'approved')
      .eq('has_sufficient_deposit', true);
      
    if (email) {
      query = query.eq('email', email);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { drivers: data || [], error: null };
  } catch (error: any) {
    console.error("Get available drivers error:", error.message);
    return { drivers: [], error: error.message };
  }
};

/**
 * Check if user is eligible to be a driver
 */
export const isEligibleDriver = async (userId: string): Promise<boolean> => {
  try {
    // Check if user has a driver profile in driver_details table (not drivers)
    const { data: driver, error: driverError } = await supabase
      .from('driver_details')
      .select('status, deposit_amount_required')
      .eq('user_id', userId)
      .single();

    if (driverError) {
      console.error("Error checking driver status:", driverError);
      return false;
    }

    if (!driver) {
      return false;
    }

    // Check if driver is approved
    if (driver.status !== 'approved') {
      return false;
    }

    // Check if driver has sufficient deposit
    const { data: walletData } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const requiredDeposit = driver.deposit_amount_required || 3000;
    const hasEnoughDeposit = walletData?.balance >= requiredDeposit;

    return hasEnoughDeposit;
  } catch (error) {
    console.error("Error checking driver eligibility:", error);
    return false;
  }
};

/**
 * Test driver_details table permissions
 */
export const testDriverDetailsPermissions = async (userId: string) => {
  try {
    console.log('Testing driver_details permissions for user:', userId);

    // Test SELECT permission
    const { data: selectData, error: selectError } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('SELECT test result:', { data: selectData, error: selectError });

    // Test UPDATE permission
    const { data: updateData, error: updateError } = await supabase
      .from('driver_details')
      .update({ 
        // Only include fields that actually exist in the table schema
        last_status_update: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .select();

    console.log('UPDATE test result:', { data: updateData, error: updateError });

    return {
      canSelect: !selectError,
      canUpdate: !updateError,
      selectError: selectError?.message,
      updateError: updateError?.message,
      hasRecord: !!selectData
    };
  } catch (error: any) {
    console.error('Error testing permissions:', error);
    return {
      canSelect: false,
      canUpdate: false,
      error: error.message
    };
  }
};
