
import { supabase } from "@/integrations/supabase/client";

// Upload a file to Supabase Storage
export const uploadFile = async (
  file: File,
  bucket: string,
  path: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return null;
  }
};

// Delete a file from Supabase Storage
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
};

// Upload driver document files
export const uploadDriverDocuments = async (
  files: {
    cnicFront?: File;
    cnicBack?: File;
    licenseFront?: File;
    licenseBack?: File;
    vehicleRegistration?: File;
    vehiclePhoto?: File;
    selfieWithCNIC?: File;
    selfiePhoto?: File;
  },
  userId: string
): Promise<{
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  vehicleRegistrationUrl?: string;
  vehiclePhotoUrl?: string;
  selfieWithCNICUrl?: string;
  selfiePhotoUrl?: string;
}> => {
  const bucket = 'driver-documents';
  const results: any = {};

  try {
    // Upload CNIC front
    if (files.cnicFront) {
      const url = await uploadFile(files.cnicFront, bucket, `${userId}/cnic_front`);
      if (url) results.cnicFrontUrl = url;
    }

    // Upload CNIC back
    if (files.cnicBack) {
      const url = await uploadFile(files.cnicBack, bucket, `${userId}/cnic_back`);
      if (url) results.cnicBackUrl = url;
    }

    // Upload License front
    if (files.licenseFront) {
      const url = await uploadFile(files.licenseFront, bucket, `${userId}/license_front`);
      if (url) results.licenseFrontUrl = url;
    }

    // Upload License back
    if (files.licenseBack) {
      const url = await uploadFile(files.licenseBack, bucket, `${userId}/license_back`);
      if (url) results.licenseBackUrl = url;
    }

    // Upload Vehicle registration
    if (files.vehicleRegistration) {
      const url = await uploadFile(files.vehicleRegistration, bucket, `${userId}/vehicle_registration`);
      if (url) results.vehicleRegistrationUrl = url;
    }

    // Upload Vehicle photo
    if (files.vehiclePhoto) {
      const url = await uploadFile(files.vehiclePhoto, bucket, `${userId}/vehicle_photo`);
      if (url) results.vehiclePhotoUrl = url;
    }

    // Upload Selfie with CNIC
    if (files.selfieWithCNIC) {
      const url = await uploadFile(files.selfieWithCNIC, bucket, `${userId}/selfie_with_cnic`);
      if (url) results.selfieWithCNICUrl = url;
    }

    // Upload Selfie photo
    if (files.selfiePhoto) {
      const url = await uploadFile(files.selfiePhoto, bucket, `${userId}/selfie_photo`);
      if (url) results.selfiePhotoUrl = url;
    }

    return results;
  } catch (error) {
    console.error('Error uploading driver documents:', error);
    return {};
  }
};
