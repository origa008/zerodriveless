import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User } from '@/lib/types';

/**
 * Signs up a user with email and password
 * @param email User's email
 * @param password User's password
 * @returns The newly created user or error
 */
export async function signUp(email: string, password: string, name?: string): Promise<{ user: User | null; error: string | null }> {
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

    if (error) {
      throw error;
    }

    // Return simplified user object
    return {
      user: {
        id: data.user?.id || '',
        email: data.user?.email || '',
        name: name || data.user?.user_metadata?.name,
        isLoggedIn: true,
        referralCode: ''
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Error signing up:', error.message);
    return {
      user: null,
      error: error.message,
    };
  }
}

/**
 * Updates a user's profile
 * @param userId User's ID
 * @param profileData Profile data to update
 * @returns Success or error message
 */
export async function updateUserProfile(
  userId: string,
  profileData: { name?: string; phone?: string; avatar?: string; address?: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profileData.name,
        phone: profileData.phone,
        avatar: profileData.avatar,
        address: profileData.address
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating profile:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Signs up a new user with email and password
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  userData: { name: string }
): Promise<{ user: User | null; error: string | null }> => {
  try {
    console.log("Starting signup process for:", email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
        },
      },
    });
    
    if (error) throw error;
    
    console.log("Signup successful, user created:", data.user?.id);
    
    // Create a user object from the auth data
    const newUser: User = {
      id: data.user?.id || '',
      name: userData.name,
      email,
      isLoggedIn: !!data.user,
      referralCode: `zerodrive-${Math.random().toString(36).substring(2, 8)}`
    };
    
    return { user: newUser, error: null };
  } catch (error: any) {
    console.error("Signup error:", error.message);
    return { user: null, error: error.message };
  }
};

/**
 * Signs in a user with email and password
 */
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<{ user: User | null; error: string | null }> => {
  try {
    console.log("Signing in with email:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (!data.user) {
      return { user: null, error: "No user data returned" };
    }
    
    console.log("Sign in successful, fetching profile for user:", data.user.id);
    
    // Fetch user profile from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error("Profile fetch error:", profileError);
      // Don't throw error to allow login without profile
    }
    
    // Create user object from auth and profile data
    const user: User = {
      id: data.user.id,
      name: profileData?.name || data.user.user_metadata.name || '',
      email: data.user.email || '',
      phone: profileData?.phone || undefined,
      avatar: profileData?.avatar || undefined,
      address: profileData?.address || undefined,
      isLoggedIn: true,
      isVerifiedDriver: profileData?.is_verified_driver || false,
      referralCode: profileData?.referral_code || undefined,
    };
    
    console.log("User profile fetched:", user.name);
    return { user, error: null };
  } catch (error: any) {
    console.error("Login error:", error.message);
    return { user: null, error: error.message };
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    console.log("Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log("Sign out successful");
    return { error: null };
  } catch (error: any) {
    console.error("Signout error:", error.message);
    return { error: error.message };
  }
};

/**
 * Sends a password reset email
 */
export const resetPassword = async (email: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error("Password reset error:", error.message);
    return { error: error.message };
  }
};

/**
 * Updates the user's password
 */
export const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error("Update password error:", error.message);
    return { error: error.message };
  }
};

/**
 * Gets the current session
 */
export const getCurrentSession = async () => {
  try {
    console.log("Getting current session...");
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    console.log("Current session:", data.session ? "exists" : "none");
    return { data, error: null };
  } catch (error: any) {
    console.error("Get session error:", error.message);
    return { data: { session: null }, error: error.message };
  }
};

/**
 * Checks if a user is logged in
 */
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    const loggedIn = !!data.session;
    console.log("isLoggedIn check:", loggedIn);
    return loggedIn;
  } catch (error) {
    console.error("isLoggedIn error:", error);
    return false;
  }
};
