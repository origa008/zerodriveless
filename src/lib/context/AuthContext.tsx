
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserProfile, mapProfileToUser } from '../utils/supabaseUtils';
import { useToast } from '@/hooks/use-toast';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initial auth check
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          const profile = await fetchUserProfile(data.session.user.id);
          
          if (profile) {
            setUser(mapProfileToUser(profile));
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const profile = await fetchUserProfile(session.user.id);
          
          if (profile) {
            setUser(mapProfileToUser(profile));
          }
          
          navigate('/');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          navigate('/welcome');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        
        if (profile) {
          setUser(mapProfileToUser(profile));
          toast({
            title: "Login successful",
            description: `Welcome back, ${profile.name}!`,
            duration: 3000,
          });
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Signup with email, password, and name
  const signup = async (email: string, password: string, name: string, referralCode?: string) => {
    try {
      setLoading(true);
      
      // Create user in Supabase Auth
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

      // If there's a referral code, create referral
      if (referralCode && data.user) {
        try {
          await supabase.rpc('create_referral', {
            referrer_code: referralCode,
            referred_id: data.user.id
          });
        } catch (refError) {
          console.error('Failed to create referral:', refError);
          // We don't throw here because the user was still created successfully
        }
      }

      toast({
        title: "Account created",
        description: "Your account has been created successfully. You can now log in.",
        duration: 5000,
      });
      
      // The user profile is created automatically via database trigger
      
      // After signup, do login
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        
        if (profile) {
          setUser(mapProfileToUser(profile));
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      navigate('/welcome');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          phone: updates.phone,
          avatar: updates.avatar,
          address: updates.address,
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Get updated profile
      const profile = await fetchUserProfile(user.id);
      
      if (profile) {
        setUser(mapProfileToUser(profile));
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "Profile update failed",
        description: error.message || "An error occurred while updating your profile",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateUserProfile,
      }}
    >
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
