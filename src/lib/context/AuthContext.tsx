import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  mapSupabaseProfileToUser, 
  ProfileFromSupabase, 
  ProfileInsert,
  ReferralInsert,
  Tables 
} from '../supabaseTypes';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
};

const defaultUser: User = {
  id: '1',
  name: 'John Smith',
  email: 'john@example.com',
  avatar: '/lovable-uploads/af7e95e3-de50-49f4-a7bf-34f40ed69687.png',
  isLoggedIn: false,
  referralCode: 'zerodrive-1',
  referralEarnings: 0
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
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
            mappedUser.avatar = '/lovable-uploads/af7e95e3-de50-49f4-a7bf-34f40ed69687.png';
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

  const signup = async (name: string, email: string, password: string, referralCode?: string) => {
    setIsLoading(true);
    try {
      const userReferralCode = `zerodrive-${Math.random().toString(36).substring(2, 8)}`;
      
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            referral_code: userReferralCode
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (data.user) {
        const newProfile: ProfileInsert = {
          id: data.user.id,
          name,
          email,
          referral_code: userReferralCode,
          avatar: '/lovable-uploads/af7e95e3-de50-49f4-a7bf-34f40ed69687.png'
        };
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert(newProfile);
        
        if (profileError) throw profileError;
        
        if (referralCode) {
          const referralData: ReferralInsert = {
            referrer_id: null,
            referred_id: data.user.id,
            status: 'pending'
          };
          
          try {
            const { data: referrerData } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_code', referralCode)
              .single();
            
            if (referrerData) {
              referralData.referrer_id = referrerData.id;
              
              const { error: referralError } = await supabase
                .from('referrals')
                .insert(referralData);
              
              if (referralError) {
                console.error('Error saving referral:', referralError);
              } else {
                toast({
                  title: "Referral Applied",
                  description: "Your account has been created with a referral.",
                  duration: 3000
                });
              }
            }
          } catch (error) {
            console.error('Error processing referral:', error);
          }
        }
      }
      
      toast({
        title: "Account Created",
        description: "Your account has been created successfully. Please check your email to verify your account.",
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
