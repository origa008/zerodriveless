
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

/**
 * Signs in a user with email and password
 */
export const signIn = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error('No user returned from sign in');
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Check if user is a driver and if they have sufficient deposit
    const { data: driverData } = await supabase
      .from('driver_details')
      .select('status, has_sufficient_deposit')
      .eq('user_id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: profileData?.name || '',
      avatar: profileData?.avatar || '',
      phone: profileData?.phone || '',
      isLoggedIn: true,
      address: profileData?.address || '',
      referralCode: profileData?.referral_code || '',
      isVerifiedDriver: profileData?.is_verified_driver || false,
      driverStatus: driverData?.status || null,
      hasDriverDeposit: driverData?.has_sufficient_deposit || false,
    };

    return { user, error: null };
  } catch (error: any) {
    console.error('Error signing in:', error.message);
    return { user: null, error: error.message };
  }
};

/**
 * Signs up a new user
 */
export const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error('No user returned from sign up');
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error signing up:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error signing out:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Updates user profile
 */
export const updateProfile = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; error: string | null }> => {
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
 * Resets user password
 */
export const resetPassword = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error resetting password:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Updates user password
 */
export const updatePassword = async (password: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating password:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Gets user by ID
 */
export const getUserById = async (userId: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;

    if (!userData.user) {
      return { user: null, error: 'User not found' };
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profileError && profileError.message !== 'No rows found') {
      throw profileError;
    }

    const user: User = {
      id: userData.user.id,
      email: userData.user.email || '',
      name: profileData?.name || '',
      avatar: profileData?.avatar || '',
      phone: profileData?.phone || '',
      isLoggedIn: true,
      address: profileData?.address || '',
      referralCode: profileData?.referral_code || '',
      isVerifiedDriver: profileData?.is_verified_driver || false,
    };

    return { user, error: null };
  } catch (error: any) {
    console.error('Error getting user:', error.message);
    return { user: null, error: error.message };
  }
};
