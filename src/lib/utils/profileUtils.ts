
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Retrieves the user profile from Supabase
 */
export const fetchUserProfile = async (userId: string): Promise<{ profile: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return { profile: null, error: "Profile not found" };
    }
    
    // Map database profile to User type
    const profile: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      avatar: data.avatar || undefined,
      address: data.address || undefined,
      isLoggedIn: true,
      isVerifiedDriver: data.is_verified_driver || false,
      referralCode: data.referral_code || undefined,
    };
    
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
    
    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error("Avatar update error:", error.message);
    return { url: null, error: error.message };
  }
};
