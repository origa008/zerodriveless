
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

/**
 * Gets user profile
 */
export const getProfile = async (userId: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Get profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profileData) {
      return { user: null, error: 'Profile not found' };
    }

    // Check driver status
    const { data: driverData } = await supabase
      .from('driver_details')
      .select('status, has_sufficient_deposit')
      .eq('user_id', userId)
      .maybeSingle();

    const user: User = {
      id: profileData.id,
      email: profileData.email || '',
      name: profileData.name,
      avatar: profileData.avatar || '',
      phone: profileData.phone || '',
      isLoggedIn: true,
      address: profileData.address || '',
      referralCode: profileData.referral_code || '',
      isVerifiedDriver: profileData.is_verified_driver || false,
      driverStatus: driverData?.status || undefined,
      hasDriverDeposit: driverData?.has_sufficient_deposit || false
    };

    return { user, error: null };
  } catch (error: any) {
    console.error('Error getting profile:', error.message);
    return { user: null, error: error.message };
  }
};

/**
 * Updates user profile
 */
export const updateProfile = async (
  userId: string,
  updates: {
    name?: string;
    phone?: string;
    address?: string;
    avatar?: string;
  }
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating profile:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Uploads profile avatar
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL for the file
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (error: any) {
    console.error('Error uploading avatar:', error.message);
    return { url: null, error: error.message };
  }
};

/**
 * Gets user referral code
 */
export const getUserReferralCode = async (userId: string): Promise<{ code: string | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return { code: data?.referral_code || null, error: null };
  } catch (error: any) {
    console.error('Error getting referral code:', error.message);
    return { code: null, error: error.message };
  }
};

/**
 * Gets user referrals
 */
export const getUserReferrals = async (userId: string): Promise<{ referrals: any[]; error: string | null }> => {
  try {
    // Get all referrals where user is the referrer
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        amount,
        completed_at,
        referred:referred_id (
          name, 
          email, 
          is_verified_driver
        )
      `)
      .eq('referrer_id', userId);

    if (error) throw error;

    return { referrals: data || [], error: null };
  } catch (error: any) {
    console.error('Error getting user referrals:', error.message);
    return { referrals: [], error: error.message };
  }
};
