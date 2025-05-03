
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Location, 
  RideOption, 
  PaymentMethod, 
  Ride, 
  Driver 
} from '../types';
import { useToast } from '@/hooks/use-toast';
import { rideOptions as defaultRideOptions } from '../utils/mockData';
import { 
  updateRideStatus,
  getRideById
} from '../utils/rideUtils';
import { supabase } from '@/integrations/supabase/client';

type RideContextType = {
  pickup: Location | null;
  dropoff: Location | null;
  pickupLocation: Location | null; // Alias for pickup to support components
  dropoffLocation: Location | null; // Alias for dropoff to support components
  selectedRide: RideOption | null;
  selectedRideOption: RideOption | null; // Alias for selectedRide to support components
  paymentMethod: PaymentMethod;
  currentRide: Ride | null;
  availableRides: RideOption[];
  availableRideOptions: RideOption[]; // Alias for availableRides
  isDriverMode: boolean;
  isPendingRide: boolean;
  estimatedPrice: number | null;
  estimatedDistance: number | null; // Added for PassengerPanel
  estimatedDuration: number | null; // Added for PassengerPanel
  isRideTimerActive: boolean; // Added for RideMap
  rideTimer: number; // Added for RideMap and RideDetails
  walletBalance: number;
  pendingRideRequests: any[];
  isSearchingRides: boolean; // Added for PassengerPanel
  userBid: number | null; // Added for PassengerPanel
  isWaitingForDriverAcceptance: boolean; // Added for PassengerPanel
  driverAcceptanceTimer: number; // Added for PassengerPanel
  isPanelOpen: boolean; // Added for PassengerPanel
  
  // Setters
  setPickup: (location: Location | null) => void;
  setDropoff: (location: Location | null) => void;
  setPickupLocation: (location: Location | null) => void; // Alias for setPickup
  setDropoffLocation: (location: Location | null) => void; // Alias for setDropoff
  setSelectedRide: (ride: RideOption | null) => void;
  setSelectedRideOption: (ride: RideOption | null) => void; // Alias for setSelectedRide
  setPaymentMethod: (method: PaymentMethod) => void;
  setCurrentRide: (ride: Ride | null) => void;
  setAvailableRides: (rides: RideOption[]) => void;
  setDriverMode: (isDriver: boolean) => void;
  setIsPendingRide: (isPending: boolean) => void;
  calculateBaseFare: (distance: number, rideType?: string) => number;
  setEstimatedPrice: (price: number | null) => void;
  setEstimatedDistance: (distance: number | null) => void; // Added for PassengerPanel
  setEstimatedDuration: (duration: number | null) => void; // Added for PassengerPanel
  setWalletBalance: (balance: number) => void;
  setPendingRideRequests: (requests: any[]) => void;
  setUserBid: (bid: number | null) => void; // Added for PassengerPanel
  setWaitingForDriverAcceptance: (isWaiting: boolean) => void; // Added for PassengerPanel
  resetDriverAcceptanceTimer: () => void; // Added for PassengerPanel
  setPanelOpen: (isOpen: boolean) => void; // Added for PassengerPanel
  
  // Ride action functions
  startRide: (rideId: string) => Promise<boolean>;
  completeRide: (rideId: string) => Promise<boolean>;
  cancelRide: (rideId: string, reason?: string) => Promise<boolean>;
  findRides: () => Promise<void>; // Added for PassengerPanel
  confirmRide: () => Promise<void>; // Added for PassengerPanel
  updateWalletBalance: (amount: number) => void; // Added for Wallet
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [availableRides, setAvailableRides] = useState<RideOption[]>(defaultRideOptions);
  const [isDriverMode, setDriverMode] = useState<boolean>(false);
  const [isPendingRide, setIsPendingRide] = useState<boolean>(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [rideTimer, setRideTimer] = useState<number>(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState<boolean>(false);
  const [isSearchingRides, setIsSearchingRides] = useState<boolean>(false);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState<boolean>(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState<number>(60);
  const [isPanelOpen, setPanelOpen] = useState<boolean>(true);
  
  const { toast } = useToast();

  const calculateBaseFare = (distance: number, rideType?: string): number => {
    const baseFare = 50;
    const perKmRate = 15;
    const typeMultiplier = rideType === 'bike' ? 0.8 : 1;
    
    return baseFare + (distance * perKmRate) * typeMultiplier;
  };

  // Add ride control functions
  const startRide = async (rideId: string): Promise<boolean> => {
    try {
      const { success } = await updateRideStatus(rideId, 'in_progress');
      
      if (success) {
        // Update the current ride with the new status
        if (currentRide && currentRide.id === rideId) {
          setCurrentRide({
            ...currentRide,
            status: 'in_progress',
            start_time: new Date().toISOString()
          });
          
          // Start the ride timer
          setRideTimer(0);
          setIsRideTimerActive(true);
        } else {
          // Fetch the ride if it's not the current one
          const { ride } = await getRideById(rideId);
          if (ride) {
            setCurrentRide(ride);
            setRideTimer(0);
            setIsRideTimerActive(true);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error starting ride:", error);
      return false;
    }
  };

  const completeRide = async (rideId: string): Promise<boolean> => {
    try {
      const { success } = await updateRideStatus(rideId, 'completed');
      
      if (success) {
        // Update the current ride with the new status
        if (currentRide && currentRide.id === rideId) {
          setCurrentRide({
            ...currentRide,
            status: 'completed',
            end_time: new Date().toISOString()
          });
          
          // Stop the ride timer
          setIsRideTimerActive(false);
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error completing ride:", error);
      return false;
    }
  };

  const cancelRide = async (rideId: string, reason?: string): Promise<boolean> => {
    try {
      const { success } = await updateRideStatus(rideId, 'cancelled');
      
      if (success) {
        // Update the current ride with the new status
        if (currentRide && currentRide.id === rideId) {
          setCurrentRide({
            ...currentRide,
            status: 'cancelled'
          });
          
          // Stop the ride timer if active
          setIsRideTimerActive(false);
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error cancelling ride:", error);
      return false;
    }
  };
  
  // Handle ride timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRideTimerActive) {
      interval = setInterval(() => {
        setRideTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRideTimerActive]);

  // For PassengerPanel
  const findRides = async (): Promise<void> => {
    setIsSearchingRides(true);
    
    // Simulate finding rides
    setTimeout(() => {
      setIsSearchingRides(false);
    }, 2000);
  };

  const confirmRide = async (): Promise<void> => {
    // Simulate confirming ride
    toast({
      title: "Ride Confirmed",
      description: "Your ride has been confirmed"
    });
  };
  
  const updateWalletBalance = (amount: number) => {
    setWalletBalance(prev => prev + amount);
  };
  
  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(60);
  };

  return (
    <RideContext.Provider value={{
      pickup,
      setPickup,
      dropoff,
      setDropoff,
      pickupLocation: pickup, // Alias
      dropoffLocation: dropoff, // Alias
      setPickupLocation: setPickup, // Alias
      setDropoffLocation: setDropoff, // Alias
      selectedRide,
      setSelectedRide,
      selectedRideOption: selectedRide, // Alias
      setSelectedRideOption: setSelectedRide, // Alias
      paymentMethod,
      setPaymentMethod,
      currentRide,
      setCurrentRide,
      availableRides,
      availableRideOptions: availableRides, // Alias
      setAvailableRides,
      isDriverMode,
      setDriverMode,
      isPendingRide,
      setIsPendingRide,
      estimatedPrice,
      setEstimatedPrice,
      estimatedDistance,
      setEstimatedDistance,
      estimatedDuration,
      setEstimatedDuration,
      calculateBaseFare,
      walletBalance,
      setWalletBalance,
      pendingRideRequests,
      setPendingRideRequests,
      rideTimer,
      isRideTimerActive,
      isSearchingRides,
      userBid,
      setUserBid,
      isWaitingForDriverAcceptance,
      setWaitingForDriverAcceptance,
      driverAcceptanceTimer,
      resetDriverAcceptanceTimer,
      isPanelOpen, 
      setPanelOpen,
      
      // Ride action functions
      startRide,
      completeRide,
      cancelRide,
      findRides,
      confirmRide,
      updateWalletBalance
    }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
