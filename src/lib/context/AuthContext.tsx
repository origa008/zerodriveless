import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOut,
  resetPassword,
  updatePassword,
  getCurrentSession
} from '../utils/authUtils';
import { 
  fetchUserProfile, 
  updateUserProfile, 
  processReferralCode 
} from '../utils/profileUtils';

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log("Auth provider initializing...");
    setIsLoading(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session ? "session exists" : "no session");
        
        if (session) {
          setTimeout(async () => {
            try {
              const { profile, error } = await fetchUserProfile(session.user.id);
              if (profile) {
                console.log("User profile fetched on auth change:", profile.name);
                setUser({ ...profile, isLoggedIn: true });
              } else {
                console.error("Error fetching profile on auth change:", error);
                setUser(null);
              }
            } catch (error) {
              console.error('Error fetching user profile on auth change:', error);
              setUser(null);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          console.log("No session in auth change event");
          setUser(null);
          setIsLoading(false);
        }
      }
    );
    
    const checkSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("Found existing session for user:", session.user.id);
          
          try {
            const { profile, error } = await fetchUserProfile(session.user.id);
            
            if (profile) {
              console.log("User profile fetched from existing session:", profile.name);
              setUser({ ...profile, isLoggedIn: true });
            } else {
              console.error("Error fetching profile from existing session:", error);
              setUser(null);
            }
          } catch (profileError) {
            console.error("Failed to fetch profile:", profileError);
            setUser(null);
          }
        } else {
          console.log("No existing session found");
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
      } finally {
        console.log("Setting isLoading to false after session check");
        setIsLoading(false);
      }
    };

    checkSession();
    
    return () => {
      console.log("Auth provider cleanup");
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: loggedInUser, error } = await signInWithEmail(email, password);
      
      if (error) {
        toast({
          title: "Login failed",
          description: error,
          variant: "destructive"
        });
        throw new Error(error);
      }
      
      if (loggedInUser) {
        setUser(loggedInUser);
        toast({
          title: "Login successful",
          description: `Welcome back, ${loggedInUser.name}!`,
        });
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, referralCode?: string) => {
    setIsLoading(true);
    try {
      const { user: newUser, error } = await signUpWithEmail(email, password, { name });
      
      if (error) {
        toast({
          title: "Signup failed",
          description: error,
          variant: "destructive"
        });
        throw new Error(error);
      }
      
      if (newUser) {
        setUser(newUser);
        toast({
          title: "Signup successful",
          description: "Your account has been created successfully.",
        });
        
        if (referralCode && newUser.id) {
          try {
            const { success, error } = await processReferralCode(referralCode, newUser.id);
            
            if (success) {
              toast({
                title: "Referral applied",
                description: "Referral code has been applied successfully!",
              });
            } else if (error) {
              console.error('Referral processing error:', error);
            }
          } catch (referralError) {
            console.error('Referral processing error:', referralError);
          }
        }
      }
    } catch (error: any) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await signOut();
      
      if (error) {
        toast({
          title: "Logout failed",
          description: error,
          variant: "destructive"
        });
        throw new Error(error);
      }
      
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error: any) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetUserPassword = async (email: string) => {
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast({
          title: "Password reset failed",
          description: error,
          variant: "destructive"
        });
        throw new Error(error);
      }
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link.",
      });
    } catch (error: any) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const updateUserPassword = async (password: string) => {
    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        toast({
          title: "Password update failed",
          description: error,
          variant: "destructive"
        });
        throw new Error(error);
      }
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Password update failed:', error);
      throw error;
    }
  };

  const updateUserProfileDetails = async (updates: Partial<User>) => {
    if (!user || !user.id) {
      toast({
        title: "Update failed",
        description: "You must be logged in to update your profile.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { success, error } = await updateUserProfile(user.id, updates);
      
      if (error || !success) {
        toast({
          title: "Profile update failed",
          description: error || "An unknown error occurred",
          variant: "destructive"
        });
        throw new Error(error || "Profile update failed");
      }
      
      setUser(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      login,
      signup,
      logout,
      resetUserPassword,
      updateUserPassword,
      updateUserProfile: updateUserProfileDetails,
      isLoading
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
