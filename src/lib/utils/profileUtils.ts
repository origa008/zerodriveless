
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Generate a unique 7-digit referral code
 */
const generateReferralCode = (): string => {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = 'ZD-';
  for (let i = 0; i < 7; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

/**
 * Retrieves the user profile from Supabase
 */
export const fetchUserProfile = async (userId: string): Promise<{ profile: User | null; error: string | null }> => {
  try {
    console.log("Fetching profile for user:", userId);
    
    if (!userId) {
      console.error("fetchUserProfile called with empty userId");
      return { profile: null, error: "Invalid user ID" };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error.message, error.code);
      
      // If the profile doesn't exist yet (could happen with new signups), create a basic one
      if (error.code === 'PGRST116') {
        console.log("No profile found, attempting to retrieve user from auth");
        
        // Try to get user data from auth
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.error("Could not retrieve user data:", userError || "No user data");
          return { profile: null, error: "User not found" };
        }
        
        // Generate a unique referral code for new user
        const referralCode = generateReferralCode();
        
        // Create a basic profile entry
        await supabase.from('profiles').insert({
          id: userId,
          name: userData.user.user_metadata.name || "New User",
          email: userData.user.email || "",
          referral_code: referralCode
        });
        
        // Return basic profile from auth data
        const basicProfile: User = {
          id: userId,
          name: userData.user.user_metadata.name || "New User",
          email: userData.user.email || "",
          referralCode: referralCode,
          isLoggedIn: true
        };
        
        return { profile: basicProfile, error: null };
      }
      
      throw error;
    }
    
    if (!data) {
      console.warn("No profile found for user:", userId);
      return { profile: null, error: "Profile not found" };
    }
    
    // Check if profile has referral code, generate if missing
    if (!data.referral_code) {
      const referralCode = generateReferralCode();
      
      await supabase
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('id', userId);
        
      data.referral_code = referralCode;
    }
    
    // Check driver registration status
    const { data: driverData } = await supabase
      .from('driver_details')
      .select('status, has_sufficient_deposit')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Map database profile to User type
    const profile: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      avatar: data.avatar || "/lovable-uploads/0c126268-4d6a-4fa5-852d-ef7350f99f87.png", // Default profile image
      address: data.address || undefined,
      isLoggedIn: true,
      isVerifiedDriver: data.is_verified_driver || false,
      referralCode: data.referral_code || undefined,
      driverStatus: driverData?.status,
      hasDriverDeposit: driverData?.has_sufficient_deposit || false,
    };
    
    console.log("Profile fetched successfully:", profile.name);
    return { profile, error: null };
  } catch (error: any) {
    console.error("Profile fetch error:", error.message);
    return { profile: null, error: error.message };
  }
};

/**
 * Updates the user profile in Supabase
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log("Updating profile for user:", userId);
    
    // Map User type to database profile structure
    const profileUpdates: Partial<ProfileRow> = {
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
    };
    
    // Only include defined fields
    Object.keys(profileUpdates).forEach(
      (key) => {
        const typedKey = key as keyof typeof profileUpdates;
        if (profileUpdates[typedKey] === undefined) {
          delete profileUpdates[typedKey];
        }
      }
    );
    
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);
    
    if (error) throw error;
    
    console.log("Profile updated successfully");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Profile update error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Updates the user avatar in storage and profile
 */
export const updateUserAvatar = async (
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> => {
  try {
    console.log("Updating avatar for user:", userId);
    
    // Upload avatar to storage
    const filename = `${userId}-${Date.now()}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filename, file);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filename);
    
    if (!urlData.publicUrl) {
      throw new Error("Failed to get public URL");
    }
    
    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar: urlData.publicUrl })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    console.log("Avatar updated successfully");
    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error("Avatar update error:", error.message);
    return { url: null, error: error.message };
  }
};

/**
 * Process a referral code
 */
export const processReferralCode = async (
  referrerCode: string, 
  referredUserId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log(`Processing referral code ${referrerCode} for user ${referredUserId}`);
    
    // Check if referrer code exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referrerCode)
      .single();
      
    if (referrerError || !referrerData) {
      return { success: false, error: "Invalid referral code" };
    }
    
    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', referredUserId)
      .maybeSingle();
      
    if (existingReferral) {
      return { success: false, error: "Referral already exists" };
    }
    
    // Create new referral
    await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerData.id,
        referred_id: referredUserId,
        status: 'pending',
        amount: 50 // Default bonus amount
      });
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Referral processing error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get referral information for a user
 */
export const getReferralInfo = async (userId: string): Promise<{ 
  referralCode: string | null; 
  referrals: any[]; 
  error: string | null 
}> => {
  try {
    console.log(`Getting referral info for user ${userId}`);
    
    // Get user's referral code
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    // Get referrals made with this code
    const { data: referralsData, error: referralsError } = await supabase
      .from('referrals')
      .select('*, referred_profiles:referred_id(name, email)')
      .eq('referrer_id', userId);
    
    if (referralsError) throw referralsError;
    
    console.log(`Retrieved referral info: code=${profileData?.referral_code}, referrals=${referralsData?.length || 0}`);
    return { 
      referralCode: profileData?.referral_code || null, 
      referrals: referralsData || [], 
      error: null 
    };
  } catch (error: any) {
    console.error("Get referral info error:", error.message);
    return { referralCode: null, referrals: [], error: error.message };
  }
};
