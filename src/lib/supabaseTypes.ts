
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from './types';
import { Database } from '@/integrations/supabase/types';

// Define the types we need from the auto-generated database types
export type Tables = Database['public']['Tables'];
export type ProfileRecord = Tables['profiles']['Row'];
export type ReferralRecord = Tables['referrals']['Row'];

// Map from Supabase database types to our application types
export type ProfileFromSupabase = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  address?: string;
  is_verified_driver?: boolean;
  referral_code?: string;
};

// Define the insert types explicitly to match Supabase's requirements
export type ProfileInsert = Tables['profiles']['Insert'];
export type ReferralInsert = Tables['referrals']['Insert'];

// Convert a Supabase profile to our application User type
export const mapSupabaseProfileToUser = (
  profile: ProfileFromSupabase,
  supabaseUser: SupabaseUser
): User => {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    avatar: profile.avatar,
    isLoggedIn: true,
    address: profile.address,
    isVerifiedDriver: profile.is_verified_driver,
    referralCode: profile.referral_code,
    referralEarnings: 0 // This would be fetched from wallet separately
  };
};
