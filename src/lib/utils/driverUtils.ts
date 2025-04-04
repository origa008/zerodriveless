
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
  documentType: string
): Promise<{ url: string | null; error: string | null }> => {
  try {
    const filename = `${userId}/${documentType}-${Date.now()}`;
    const fileExtension = file.name.split('.').pop();
    const fullFilename = `${filename}.${fileExtension}`;
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('driver_documents')
      .upload(fullFilename, file);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('driver_documents')
      .getPublicUrl(fullFilename);
    
    if (!urlData.publicUrl) {
      throw new Error("Failed to get public URL");
    }
    
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
  }
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const driverDetails: DriverDetailInsert = {
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
    
    const { error } = await supabase
      .from('driver_details')
      .upsert(driverDetails);
    
    if (error) throw error;
    
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
    const { data, error } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      return { status: null, isApproved: false, details: null, error: null };
    }
    
    return { 
      status: data.status, 
      isApproved: data.status === 'approved',
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
  const channel = supabase
    .channel(`driver_details:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
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
