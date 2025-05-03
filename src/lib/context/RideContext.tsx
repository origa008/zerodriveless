
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RideOption, Location, Ride, PaymentMethod } from '@/lib/types';
import { subscribeToRideStatus, acceptRideRequest } from '@/lib/utils/rideUtils';

// Default ride options
const DEFAULT_RIDE_OPTIONS: RideOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    type: 'car',
    basePrice: 100,
    image: '/lovable-uploads/546d2513-9d53-4ba5-b5ab-99557b3113c0.png',
    description: 'Economic option for everyday rides',
  },
  {
    id: 'premium',
    name: 'Premium',
    type: 'car',
    basePrice: 150,
    image: '/lovable-uploads/b0c8ef68-391d-426a-831c-1baaecaa8ddb.png',
    description: 'Comfortable rides with top-rated drivers',
  },
  {
    id: 'bike',
    name: 'Bike',
    type: 'bike',
    basePrice: 70,
    image: '/lovable-uploads/0c126268-4d6a-4fa5-852d-ef7350f99f87.png',
    description: 'Quick and affordable for short distances',
  },
];

// Context type definition
export type RideContextType = {
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  selectedRideOption: RideOption | null;
  currentRide: Ride | null;
  isDriverMode: boolean;
  pendingRideRequests: any[];
  walletBalance: number;
  rideTimer: number;
  isRideTimerActive: boolean;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  setSelectedRideOption: (option: RideOption | null) => void;
  calculateBaseFare: (distance: number, rideTypeName: string) => number;
  formatCurrency: (amount: number, currency?: string) => string;
  setCurrentRide: (ride: Ride | null) => void;
  clearCurrentRide: () => void;
  toggleDriverMode: () => void;
  setPendingRideRequests: (rides: any[]) => void;
  setWalletBalance: (balance: number) => void;
  startRideTimer: () => void;
  stopRideTimer: () => void;
  resetRideTimer: () => void;
  
  // Additional properties needed by components
  setDriverMode: (isDriverMode: boolean) => void;
  acceptRideRequest: (rideId: string, driverId: string) => Promise<{ success: boolean; error?: string }>;
  availableRideOptions: RideOption[];
  findRides: () => void;
  confirmRide: (paymentMethod?: PaymentMethod) => void;
  isSearchingRides: boolean;
  estimatedDistance: number;
  estimatedDuration: number;
  userBid: number;
  setUserBid: (bid: number) => void;
  isWaitingForDriverAcceptance: boolean;
  setWaitingForDriverAcceptance: (isWaiting: boolean) => void;
  driverAcceptanceTimer: number;
  resetDriverAcceptanceTimer: () => void;
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
};

// Create context
export const RideContext = createContext<RideContextType | undefined>(undefined);

// Provider component
export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [selectedRideOption, setSelectedRideOption] = useState<RideOption | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [rideTimer, setRideTimer] = useState(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Additional states needed by components
  const [availableRideOptions, setAvailableRideOptions] = useState<RideOption[]>(DEFAULT_RIDE_OPTIONS);
  const [isSearchingRides, setIsSearchingRides] = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [userBid, setUserBid] = useState(0);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState(0);
  const [isPanelOpen, setPanelOpen] = useState(false);

  // Monitor current ride status changes
  useEffect(() => {
    if (currentRide?.id) {
      const unsubscribe = subscribeToRideStatus(currentRide.id, (updatedRide) => {
        console.log('Ride status updated:', updatedRide);
        setCurrentRide(prev => prev ? { ...prev, status: updatedRide.status } : null);
      });
      
      return () => unsubscribe();
    }
  }, [currentRide?.id]);

  // Handle wallet balance fetching
  useEffect(() => {
    if (user?.id) {
      const fetchWalletBalance = async () => {
        try {
          const { data, error } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();
            
          if (!error && data) {
            setWalletBalance(data.balance || 0);
          }
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
        }
      };
      
      fetchWalletBalance();
    } else {
      setPendingRideRequests([]);
    }
  }, [user?.id]);

  // Timer functionality
  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const startRideTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    
    setIsRideTimerActive(true);
    const interval = setInterval(() => {
      setRideTimer(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };
  
  const stopRideTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsRideTimerActive(false);
  };
  
  const resetRideTimer = () => {
    stopRideTimer();
    setRideTimer(0);
  };

  const calculateBaseFare = (distance: number, rideTypeName: string): number => {
    const rideType = DEFAULT_RIDE_OPTIONS.find(option => option.name === rideTypeName) || 
                     DEFAULT_RIDE_OPTIONS[0];
    
    const basePrice = rideType.basePrice;
    const perKmRate = basePrice / 10; // Rs per km
    
    return Math.round(basePrice + (distance * perKmRate));
  };

  const formatCurrency = (amount: number, currency: string = 'RS'): string => {
    return `${amount} ${currency}`;
  };

  const clearCurrentRide = () => {
    setCurrentRide(null);
    setPickupLocation(null);
    setDropoffLocation(null);
    setSelectedRideOption(null);
    resetRideTimer();
  };

  const toggleDriverMode = () => {
    setIsDriverMode(prev => !prev);
  };
  
  const setDriverMode = (mode: boolean) => {
    setIsDriverMode(mode);
  };
  
  // Placeholder functions needed by components
  const findRides = () => {
    setIsSearchingRides(true);
    // Implementation would go here
    setTimeout(() => {
      setIsSearchingRides(false);
      setPanelOpen(true);
    }, 2000);
  };
  
  const confirmRide = (paymentMethod: PaymentMethod = 'cash') => {
    // Implementation would go here
    console.log('Confirming ride with payment method:', paymentMethod);
  };
  
  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(0);
  };

  const value: RideContextType = {
    pickupLocation,
    dropoffLocation,
    selectedRideOption,
    currentRide,
    isDriverMode,
    pendingRideRequests,
    walletBalance,
    rideTimer,
    isRideTimerActive,
    setPickupLocation,
    setDropoffLocation,
    setSelectedRideOption,
    calculateBaseFare,
    formatCurrency,
    setCurrentRide,
    clearCurrentRide,
    toggleDriverMode,
    setPendingRideRequests,
    setWalletBalance,
    startRideTimer,
    stopRideTimer,
    resetRideTimer,
    
    // Additional properties needed by components
    setDriverMode,
    acceptRideRequest,
    availableRideOptions,
    findRides,
    confirmRide,
    isSearchingRides,
    estimatedDistance,
    estimatedDuration,
    userBid,
    setUserBid,
    isWaitingForDriverAcceptance,
    setWaitingForDriverAcceptance,
    driverAcceptanceTimer,
    resetDriverAcceptanceTimer,
    isPanelOpen,
    setPanelOpen,
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
};

// Hook to use the ride context
export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
