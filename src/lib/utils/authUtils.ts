
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Signs up a new user with email and password
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  userData: { name: string }
): Promise<{ user: User | null; error: string | null }> => {
  try {
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
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Profile fetch error:", profileError);
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
  console.log("Getting current session...");
  const session = await supabase.auth.getSession();
  console.log("Current session:", session.data.session ? "exists" : "none");
  return session;
};

/**
 * Checks if a user is logged in
 */
export const isLoggedIn = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  const loggedIn = !!data.session;
  console.log("isLoggedIn check:", loggedIn);
  return loggedIn;
};
