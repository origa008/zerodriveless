import React, { createContext, useContext, useState, useEffect } from 'react';
import { rideOptions as defaultRideOptions } from '../utils/mockData'; 
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Location, RideOption, PaymentMethod, Ride } from '../types';
import { calculateFare } from '../utils/rideUtils';
import { supabase } from '@/integrations/supabase/client';
import { getRideById } from '../utils/rideUtils';

// Define context type
interface RideContextType {
  isDriverMode: boolean;
  setDriverMode: (isDriver: boolean) => void;
  currentRide: Ride | null;
  setCurrentRide: (ride: Ride | null) => void;
  clearCurrentRide: () => void;
  walletBalance: number;
  pickupLocation: Location | null;
  setPickupLocation: (location: Location) => void;
  dropoffLocation: Location | null;
  setDropoffLocation: (location: Location) => void;
  availableRideOptions: RideOption[];
  findRides: () => void;
  selectedRideOption: RideOption | null;
  setSelectedRideOption: (option: RideOption | null) => void;
  confirmRide: (paymentMethod: PaymentMethod) => void;
  isSearchingRides: boolean;
  estimatedDistance: number | null;
  estimatedDuration: number | null;
  calculateBaseFare: (distance: number, rideType: string) => number;
  userBid: number | null;
  setUserBid: (amount: number) => void;
  isWaitingForDriverAcceptance: boolean;
  setWaitingForDriverAcceptance: (waiting: boolean) => void;
  driverAcceptanceTimer: number;
  resetDriverAcceptanceTimer: () => void;
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
  startRide: (rideId: string) => Promise<boolean>;
  completeRide: (rideId: string) => Promise<boolean>;
  cancelRide: (rideId: string, reason?: string) => Promise<boolean>;
  rideTimer: number;
  isRideTimerActive: boolean;
  updateWalletBalance: (amount: number) => Promise<boolean>;
}

// Create context with default values
const RideContext = createContext<RideContextType>({
  isDriverMode: false,
  setDriverMode: () => {},
  currentRide: null,
  setCurrentRide: () => {},
  clearCurrentRide: () => {},
  walletBalance: 0,
  pickupLocation: null,
  setPickupLocation: () => {},
  dropoffLocation: null,
  setDropoffLocation: () => {},
  availableRideOptions: [],
  findRides: () => {},
  selectedRideOption: null,
  setSelectedRideOption: () => {},
  confirmRide: () => {},
  isSearchingRides: false,
  estimatedDistance: null,
  estimatedDuration: null,
  calculateBaseFare: () => 0,
  userBid: null,
  setUserBid: () => {},
  isWaitingForDriverAcceptance: false,
  setWaitingForDriverAcceptance: () => {},
  driverAcceptanceTimer: 60,
  resetDriverAcceptanceTimer: () => {},
  isPanelOpen: false,
  setPanelOpen: () => {},
  startRide: async () => false,
  completeRide: async () => false,
  cancelRide: async () => false,
  rideTimer: 0,
  isRideTimerActive: false,
  updateWalletBalance: async () => false,
});

// Provider component
export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [availableRideOptions, setAvailableRideOptions] = useState<RideOption[]>(defaultRideOptions);
  const [isSearchingRides, setIsSearchingRides] = useState(false);
  const [selectedRideOption, setSelectedRideOption] = useState<RideOption | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState(60);
  const [driverAcceptanceTimerId, setDriverAcceptanceTimerId] = useState<NodeJS.Timeout | null>(null);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [rideTimer, setRideTimer] = useState(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState(false);
  const [rideTimerId, setRideTimerId] = useState<NodeJS.Timeout | null>(null);

  // Calculate base fare
  const calculateBaseFare = (distance: number, rideType: string = 'car'): number => {
    return calculateFare(distance, rideType);
  };

  // Reset the driver acceptance timer
  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(60);
    
    if (driverAcceptanceTimerId) {
      clearInterval(driverAcceptanceTimerId);
    }
    
    const timerId = setInterval(() => {
      setDriverAcceptanceTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setDriverAcceptanceTimerId(timerId);
  };
  
  // Clear driver acceptance timer
  useEffect(() => {
    return () => {
      if (driverAcceptanceTimerId) {
        clearInterval(driverAcceptanceTimerId);
      }
    };
  }, [driverAcceptanceTimerId]);

  // Find rides implementation
  const findRides = () => {
    if (!pickupLocation || !dropoffLocation) {
      toast({
        title: "Missing location",
        description: "Please select both pickup and dropoff locations",
        duration: 3000
      });
      return;
    }
    
    setIsSearchingRides(true);
    
    // Simulate API call for ride search
    setTimeout(() => {
      // Calculate distance and duration (simplified for demo)
      const lat1 = pickupLocation.coordinates[1];
      const lon1 = pickupLocation.coordinates[0];
      const lat2 = dropoffLocation.coordinates[1];
      const lon2 = dropoffLocation.coordinates[0];
      
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = Math.round(R * c * 10) / 10; // Distance in km, rounded to 1 decimal place
      
      // Estimated time based on average speed of 30 km/h
      const duration = Math.round(distance * 2); // Minutes
      
      setEstimatedDistance(distance);
      setEstimatedDuration(duration);
      
      // Update ride options with price based on distance
      const updatedOptions = availableRideOptions.map(option => {
        const price = calculateBaseFare(distance, option.type);
        return {
          ...option,
          price,
          duration
        };
      });
      
      setAvailableRideOptions(updatedOptions);
      setIsSearchingRides(false);
      setPanelOpen(true);
    }, 1500);
  };
  
  // Clear current ride
  const clearCurrentRide = () => {
    setCurrentRide(null);
    setPickupLocation(null);
    setDropoffLocation(null);
    setSelectedRideOption(null);
    setEstimatedDistance(null);
    setEstimatedDuration(null);
    setUserBid(null);
    setWaitingForDriverAcceptance(false);
    if (driverAcceptanceTimerId) {
      clearInterval(driverAcceptanceTimerId);
      setDriverAcceptanceTimerId(null);
    }
    setPanelOpen(false);
  };

  // Confirm ride
  const confirmRide = async (paymentMethod: PaymentMethod) => {
    if (!user?.id || !pickupLocation || !dropoffLocation || !selectedRideOption || !userBid) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields",
        duration: 3000
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('rides')
        .insert({
          passenger_id: user.id,
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation,
          ride_option: selectedRideOption,
          price: userBid,
          currency: 'RS',
          distance: estimatedDistance || 0,
          duration: estimatedDuration || 0,
          status: 'searching',
          payment_method: paymentMethod,
          bid_amount: userBid
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Set current ride
      setCurrentRide({
        id: data.id,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        rideOption: selectedRideOption,
        price: userBid,
        distance: estimatedDistance || 0,
        duration: estimatedDuration || 0,
        status: 'searching',
        paymentMethod: paymentMethod,
        currency: 'RS',
      });
      
    } catch (error: any) {
      console.error("Error creating ride:", error);
      toast({
        title: "Error",
        description: "Failed to create ride request",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Start a ride
  const startRide = async (rideId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .eq('id', rideId);
      
      if (error) throw error;
      
      if (currentRide) {
        setCurrentRide({
          ...currentRide,
          status: 'in_progress',
          start_time: new Date().toISOString()
        });
      }
      
      // Start the ride timer
      setIsRideTimerActive(true);
      setRideTimer(0);
      
      const timerId = setInterval(() => {
        setRideTimer(prev => prev + 1);
      }, 1000);
      
      setRideTimerId(timerId);
      
      return true;
    } catch (error) {
      console.error("Error starting ride:", error);
      return false;
    }
  };
  
  // Complete a ride
  const completeRide = async (rideId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', rideId);
      
      if (error) throw error;
      
      if (currentRide) {
        setCurrentRide({
          ...currentRide,
          status: 'completed',
          end_time: new Date().toISOString()
        });
      }
      
      // Stop the ride timer
      if (rideTimerId) {
        clearInterval(rideTimerId);
        setRideTimerId(null);
      }
      setIsRideTimerActive(false);
      
      return true;
    } catch (error) {
      console.error("Error completing ride:", error);
      return false;
    }
  };
  
  // Cancel a ride
  const cancelRide = async (rideId: string, reason?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'cancelled',
          end_time: new Date().toISOString(),
          // We don't have a cancellation_reason column but could add it
        })
        .eq('id', rideId);
      
      if (error) throw error;
      
      if (currentRide) {
        setCurrentRide({
          ...currentRide,
          status: 'cancelled',
          end_time: new Date().toISOString()
        });
      }
      
      // Stop any timers
      if (rideTimerId) {
        clearInterval(rideTimerId);
        setRideTimerId(null);
      }
      setIsRideTimerActive(false);
      
      return true;
    } catch (error) {
      console.error("Error cancelling ride:", error);
      return false;
    }
  };

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        setWalletBalance(data?.balance || 0);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      }
    };
    
    fetchWalletBalance();
  }, [user]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (rideTimerId) {
        clearInterval(rideTimerId);
      }
    };
  }, [rideTimerId]);

  // Add the updateWalletBalance implementation to the provider value
  const value = {
    isDriverMode,
    setDriverMode: setIsDriverMode,
    currentRide,
    setCurrentRide,
    clearCurrentRide,
    walletBalance,
    pickupLocation,
    setPickupLocation,
    dropoffLocation,
    setDropoffLocation,
    availableRideOptions,
    findRides,
    selectedRideOption,
    setSelectedRideOption,
    confirmRide,
    isSearchingRides,
    estimatedDistance,
    estimatedDuration,
    calculateBaseFare,
    userBid,
    setUserBid,
    isWaitingForDriverAcceptance,
    setWaitingForDriverAcceptance,
    driverAcceptanceTimer,
    resetDriverAcceptanceTimer,
    isPanelOpen,
    setPanelOpen,
    startRide,
    completeRide,
    cancelRide,
    rideTimer,
    isRideTimerActive,
    updateWalletBalance: async (amount: number) => {
      try {
        if (!user?.id) return false;
        
        const { error } = await supabase.rpc(
          'add_to_wallet',
          { user_id: user.id, amount }
        );
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error updating wallet balance:', error);
        return false;
      }
    },
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
};

// Custom hook
export const useRide = () => useContext(RideContext);
