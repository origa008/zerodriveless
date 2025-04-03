
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User } from '../types';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  profile: any | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching profile:', error);
      return null;
    }
  };

  // Get wallet balance
  const fetchWalletBalance = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
        return 0;
      }

      return data?.balance || 0;
    } catch (error) {
      console.error('Exception fetching wallet:', error);
      return 0;
    }
  };

  // Transform Supabase user to app User
  const transformUser = async (supabaseUser: SupabaseUser | null, profileData: any | null): Promise<User | null> => {
    if (!supabaseUser) return null;

    // If no profile data was passed, try to fetch it
    const profile = profileData || await fetchProfile(supabaseUser.id);
    const walletBalance = await fetchWalletBalance(supabaseUser.id);

    return {
      id: supabaseUser.id,
      name: profile?.name || 'User',
      email: supabaseUser.email || '',
      avatar: profile?.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png',
      isLoggedIn: true,
      referralCode: profile?.referral_code || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      isVerifiedDriver: profile?.is_verified_driver || false,
      referralEarnings: walletBalance || 0
    };
  };
  
  // Initialize auth state from Supabase
  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        // Update user and profile on auth state change
        if (newSession?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
            const transformedUser = await transformUser(newSession.user, profileData);
            setUser(transformedUser);
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        setSession(currentSession);
        const profileData = await fetchProfile(currentSession.user.id);
        setProfile(profileData);
        const transformedUser = await transformUser(currentSession.user, profileData);
        setUser(transformedUser);
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      // Redirect to index page on successful login
      window.location.href = '/';
    } catch (error: any) {
      console.error('Login failed:', error.message);
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
      // Register the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // If referral code provided, create referral
      if (referralCode && authData?.user) {
        await supabase.rpc('create_referral', {
          referrer_code: referralCode,
          referred_id: authData.user.id
        });
      }

      // Redirect to index page after successful signup
      window.location.href = '/';
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
        duration: 5000
      });
    } catch (error: any) {
      console.error('Signup failed:', error.message);
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
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user || !user.id) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          phone: updates.phone,
          address: updates.address,
          avatar: updates.avatar
        })
        .eq('id', user.id);
      
      if (error) {
        throw error;
      }

      // Update local state
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
      
      const updatedUser = {
        ...user,
        ...updates
      };
      setUser(updatedUser);
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
        duration: 3000
      });
    } catch (error: any) {
      console.error('Profile update failed:', error.message);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive"
      });
    }
  };

  const contextValue: AuthContextType = {
    user,
    profile,
    session,
    login,
    signup,
    logout,
    isLoading,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
