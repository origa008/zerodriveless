
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DriverRegistrationStatus } from '../types';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (data: Partial<User>) => void;
  driverRegistrationStatus: DriverRegistrationStatus;
  setDriverRegistrationStatus: (status: DriverRegistrationStatus) => void;
  referralEarnings: number;
  addReferralEarning: (amount: number) => void;
};

const defaultUser: User = {
  id: '1',
  name: 'John Smith',
  email: 'john@example.com',
  avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png',
  isLoggedIn: false,
  referralCode: 'JOHN123',
  referralEarnings: 0,
  isRegisteredDriver: false
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [driverRegistrationStatus, setDriverRegistrationStatus] = useState<DriverRegistrationStatus>('not_started');
  const [referralEarnings, setReferralEarnings] = useState<number>(0);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('zerodrive_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Check if driver registration status exists
    const storedDriverStatus = localStorage.getItem('driver_registration_status');
    if (storedDriverStatus) {
      setDriverRegistrationStatus(storedDriverStatus as DriverRegistrationStatus);
    }
    
    // Check if referral earnings exist
    const storedReferralEarnings = localStorage.getItem('referral_earnings');
    if (storedReferralEarnings) {
      setReferralEarnings(parseFloat(storedReferralEarnings));
    }
    
    setIsLoading(false);
  }, []);

  const updateUserProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('zerodrive_user', JSON.stringify(updatedUser));
    }
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

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock signup - in real app this would call an API
      const newUser = { 
        ...defaultUser, 
        name, 
        email,
        isLoggedIn: true,
        referralCode: name.toUpperCase().substring(0, 4) + Math.floor(Math.random() * 1000)
      };
      setUser(newUser);
      localStorage.setItem('zerodrive_user', JSON.stringify(newUser));
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

  const addReferralEarning = (amount: number) => {
    const newEarnings = referralEarnings + amount;
    setReferralEarnings(newEarnings);
    localStorage.setItem('referral_earnings', newEarnings.toString());
    
    // Update user earnings as well
    if (user) {
      updateUserProfile({ referralEarnings: newEarnings });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      isLoading, 
      updateUserProfile,
      driverRegistrationStatus,
      setDriverRegistrationStatus,
      referralEarnings,
      addReferralEarning
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
