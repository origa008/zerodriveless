
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  mapSupabaseProfileToUser, 
  ProfileFromSupabase, 
  ProfileInsert,
  ReferralInsert
} from '../supabaseTypes';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, referralCode?: string | null) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Use setTimeout to prevent Supabase deadlocks
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Existing session check:", currentSession ? "Found" : "None");
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const supabaseUser = session?.user || null;
        if (supabaseUser) {
          const mappedUser = mapSupabaseProfileToUser(data as ProfileFromSupabase, supabaseUser);
          if (!mappedUser.avatar) {
            mappedUser.avatar = '/lovable-uploads/avatar.png';
          }
          setUser(mappedUser);
        }
      } else {
        console.error('No profile found for user');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const supabaseUpdates: Partial<ProfileFromSupabase> = {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        avatar: updates.avatar,
        address: updates.address,
        is_verified_driver: updates.isVerifiedDriver,
        referral_code: updates.referralCode
      };
      
      const filteredUpdates = Object.entries(supabaseUpdates)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      const { error } = await supabase
        .from('profiles')
        .update(filteredUpdates)
        .eq('id', user.id);
      
      if (error) throw error;
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // The onAuthStateChange hook will set the user
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, referralCode?: string | null) => {
    setIsLoading(true);
    try {
      console.log("Signing up user:", { name, email, referralCode: referralCode || 'none' });
      
      // Generate a unique referral code
      const userReferralCode = `zerodrive-${Math.random().toString(36).substring(2, 8)}`;
      
      // Step 1: Sign up the user with Supabase Auth
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) throw signUpError;
      
      if (!data.user) {
        throw new Error("Failed to create user account");
      }
      
      console.log("User created successfully:", data.user.id);
      
      // Check if a profile already exists for this user (important for sign-in with duplicate email)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (profileCheckError) {
        console.error('Error checking existing profile:', profileCheckError);
      }
      
      // Only create a profile if one doesn't already exist
      if (!existingProfile) {
        // Step 2: Create a profile for the new user
        const newProfile: ProfileInsert = {
          id: data.user.id,
          name,
          email,
          referral_code: userReferralCode,
          avatar: '/lovable-uploads/avatar.png'
        };
        
        console.log("Creating user profile:", newProfile);
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert(newProfile);
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Continue even if profile creation fails, as user auth account was created
          if (profileError.code === '23505') { // duplicate key error
            console.log('Profile already exists, skipping creation');
          } else {
            throw profileError;
          }
        } else {
          console.log("Profile created successfully");
        }
      } else {
        console.log("Profile already exists, skipping creation");
      }
      
      // Step 3: Process referral code if provided
      if (referralCode && referralCode.trim() !== '') {
        try {
          console.log("Processing referral code:", referralCode);
          
          // Find the referrer using the provided referral code
          const { data: referrerData, error: referrerError } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .maybeSingle();
          
          if (referrerError) {
            console.error('Error finding referrer:', referrerError);
          }
          
          if (referrerData) {
            console.log("Referrer found:", referrerData.id);
            
            // Create a referral record
            const referralData: ReferralInsert = {
              referrer_id: referrerData.id,
              referred_id: data.user.id,
              status: 'pending'
            };
            
            const { error: referralError } = await supabase
              .from('referrals')
              .insert(referralData);
            
            if (referralError) {
              console.error('Error saving referral:', referralError);
            } else {
              console.log("Referral record created successfully");
              toast({
                title: "Referral Applied",
                description: "Your account has been created with a referral.",
                duration: 3000
              });
            }
          } else {
            console.log("No referrer found with code:", referralCode);
          }
        } catch (error) {
          console.error('Error processing referral:', error);
          // Don't fail signup if referral processing fails
        }
      }
      
      toast({
        title: "Account Created",
        description: "Your account has been created successfully. Please verify your email if required.",
        duration: 5000
      });
    } catch (error: any) {
      console.error('Signup failed:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      isLoading,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
