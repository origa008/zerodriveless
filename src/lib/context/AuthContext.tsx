
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (updates: Partial<User>) => void;
};

const defaultUser: User = {
  id: '1',
  name: 'John Smith',
  email: 'john@example.com',
  avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png',
  isLoggedIn: false,
  referralCode: 'zerodrive-1',
  referralEarnings: 0
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('zerodrive_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const updateUserProfile = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('zerodrive_user', JSON.stringify(updatedUser));
    
    toast({
      title: "Profile Updated",
      description: "Your profile information has been updated successfully.",
      duration: 3000
    });
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock login - in real app this would call an API
      // For demo purposes we just set the user
      const loggedInUser = { ...defaultUser, isLoggedIn: true };
      setUser(loggedInUser);
      localStorage.setItem('zerodrive_user', JSON.stringify(loggedInUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, referralCode?: string) => {
    setIsLoading(true);
    try {
      // Generate unique referral code for new user
      const userReferralCode = `zerodrive-${Math.random().toString(36).substring(2, 8)}`;
      
      // Mock signup - in real app this would call an API
      const newUser = { 
        ...defaultUser, 
        name, 
        email,
        isLoggedIn: true,
        referralCode: userReferralCode,
        referralEarnings: 0
      };
      
      setUser(newUser);
      localStorage.setItem('zerodrive_user', JSON.stringify(newUser));
      
      // In a real app, would process the referral here
      if (referralCode) {
        console.log(`User signed up with referral code: ${referralCode}`);
        toast({
          title: "Referral Applied",
          description: "Your account has been created with a referral.",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zerodrive_user');
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
