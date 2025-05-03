
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
  updates: Partial<User>
): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Filter out User fields that don't exist in the profiles table
    const profileUpdates = {
      name: updates.name,
      phone: updates.phone,
      avatar: updates.avatar,
      address: updates.address
    };

    // Update the profiles table
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
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
 * Updates user's avatar
 */
export const updateUserAvatar = async (
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> => {
  try {
    const { url, error } = await uploadAvatar(userId, file);
    if (error) throw new Error(error);
    
    if (url) {
      // Update the user's profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: url })
        .eq('id', userId);
        
      if (updateError) throw updateError;
    }
    
    return { url, error: null };
  } catch (error: any) {
    console.error('Error updating avatar:', error.message);
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

/**
 * Fetches user profile
 */
export const fetchUserProfile = async (userId: string): Promise<{ profile: User | null; error: string | null }> => {
  const { user, error } = await getProfile(userId);
  return { profile: user, error };
};

/**
 * Updates user profile with additional fields
 */
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; error: string | null }> => {
  return await updateProfile(userId, updates);
};

/**
 * Process a referral code
 */
export const processReferralCode = async (referralCode: string, userId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Query profiles to find the referrer
    const { data: referrerData, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single();
    
    if (referrerError || !referrerData) {
      return { success: false, error: 'Invalid referral code' };
    }
    
    // Create a referral entry
    const { error } = await supabase
      .from('referrals')
      .insert([{
        referrer_id: referrerData.id,
        referred_id: userId,
        status: 'pending'
      }]);
      
    if (error) {
      if (error.message.includes('duplicate')) {
        return { success: false, error: 'Referral already exists' };
      }
      throw error;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error processing referral code:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get referral info for a user
 */
export const getReferralInfo = async (userId: string): Promise<{ referralCode: string | null; referrals: any[]; error: string | null }> => {
  try {
    // Get user's referral code
    const { code, error: codeError } = await getUserReferralCode(userId);
    
    if (codeError) {
      throw new Error(codeError);
    }
    
    // Get user's referrals
    const { referrals, error: referralsError } = await getUserReferrals(userId);
    
    if (referralsError) {
      throw new Error(referralsError);
    }
    
    return {
      referralCode: code,
      referrals,
      error: null
    };
  } catch (error: any) {
    console.error('Error getting referral info:', error.message);
    return { 
      referralCode: null, 
      referrals: [],
      error: error.message 
    };
  }
};
