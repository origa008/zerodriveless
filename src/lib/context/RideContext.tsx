import React, { createContext, useContext, useState, useEffect } from 'react';
import { RideOption, Location, Driver, PaymentMethod, Ride } from '../types';
import { createRideRequest, updateRideStatus, getRideDetails } from '../utils/rideUtils';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMockRideOptions } from '../utils/mockData';
import { getWalletBalance, getTransactionHistory, subscribeToWalletBalance } from '../utils/walletUtils';

type RideContextType = {
  pickup: Location | null;
  setPickup: (pickup: Location | null) => void;
  dropoff: Location | null;
  setDropoff: (dropoff: Location | null) => void;
  selectedOption: RideOption | null;
  setSelectedOption: (option: RideOption | null) => void;
  isDriverMode: boolean;
  setDriverMode: (isDriver: boolean) => void;
  pendingRideRequests: any[];
  setPendingRideRequests: (requests: any[]) => void;
  
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  availableRideOptions: RideOption[];
  findRides: () => void;
  selectedRideOption: RideOption | null;
  setSelectedRideOption: (option: RideOption | null) => void;
  confirmRide: (paymentMethod: PaymentMethod) => void;
  isSearchingRides: boolean;
  estimatedDistance: number | null;
  estimatedDuration: number | null;
  calculateBaseFare: (distance: number, vehicleType: string) => number;
  userBid: number | null;
  setUserBid: (bid: number | null) => void;
  isWaitingForDriverAcceptance: boolean;
  setWaitingForDriverAcceptance: (isWaiting: boolean) => void;
  driverAcceptanceTimer: number;
  resetDriverAcceptanceTimer: () => void;
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
  
  currentRide: Ride | null;
  setCurrentRide: (ride: Ride | null) => void;
  rideTimer: number;
  isRideTimerActive: boolean;
  walletBalance: number;
  
  acceptRideRequest: (rideId: string) => void;
  startRide: () => void;
  completeRide: () => void;
  cancelRide: () => void;
  
  updateWalletBalance: (amount: number) => void;
  rideHistory: Ride[];
  transactions: any[];
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [selectedOption, setSelectedOption] = useState<RideOption | null>(null);
  const [isDriverMode, setDriverMode] = useState<boolean>(false);
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [availableRideOptions, setAvailableRideOptions] = useState<RideOption[]>([]);
  const [selectedRideOption, setSelectedRideOption] = useState<RideOption | null>(null);
  const [isSearchingRides, setIsSearchingRides] = useState<boolean>(false);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState<boolean>(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState<number>(60);
  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [rideTimer, setRideTimer] = useState<number>(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  useEffect(() => {
    if (user?.id) {
      getWalletBalance(user.id).then(({ balance, error }) => {
        if (!error) {
          setWalletBalance(balance);
        }
      });
      
      getTransactionHistory(user.id).then(({ transactions, error }) => {
        if (!error) {
          setTransactions(transactions);
        }
      });
      
      const unsubscribe = subscribeToWalletBalance(user.id, (newBalance) => {
        setWalletBalance(newBalance);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user?.id]);
  
  const findRides = () => {
    if (!pickupLocation || !dropoffLocation) return;
    
    setIsSearchingRides(true);
    
    setTimeout(() => {
      setEstimatedDistance(5.2);
      setEstimatedDuration(12);
      setAvailableRideOptions(getMockRideOptions());
      setIsSearchingRides(false);
      setPanelOpen(true);
    }, 1500);
  };
  
  const calculateBaseFare = (distance: number, vehicleType: string): number => {
    const baseRate = vehicleType === 'Bike' ? 20 : 35;
    return Math.round(baseRate * distance);
  };
  
  const confirmRide = (paymentMethod: PaymentMethod) => {
    if (!user?.id || !pickupLocation || !dropoffLocation || !selectedRideOption || !userBid) {
      toast({
        title: "Error",
        description: "Missing required information to create ride request",
        duration: 3000
      });
      return;
    }
    
    if (estimatedDistance) {
      createRideRequest(
        user.id,
        pickupLocation,
        dropoffLocation,
        selectedRideOption,
        userBid,
        estimatedDistance,
        estimatedDuration || 0,
        paymentMethod
      ).then(({ rideId, error }) => {
        if (error) {
          toast({
            title: "Error",
            description: error,
            duration: 3000
          });
        }
      });
    }
  };
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isWaitingForDriverAcceptance && driverAcceptanceTimer > 0) {
      timer = setInterval(() => {
        setDriverAcceptanceTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWaitingForDriverAcceptance, driverAcceptanceTimer]);
  
  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(60);
  };
  
  const acceptRideRequest = (rideId: string) => {
    setPendingRideRequests(prev => prev.filter(request => request.id !== rideId));
  };
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRideTimerActive) {
      timer = setInterval(() => {
        setRideTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRideTimerActive]);
  
  const startRide = () => {
    if (!currentRide) return;
    
    setIsRideTimerActive(true);
    updateRideStatus(currentRide.id, 'in_progress')
      .then(({ success, error }) => {
        if (!success) {
          toast({
            title: "Error",
            description: error || "Failed to start ride",
            duration: 3000
          });
        } else {
          setCurrentRide(prev => prev ? {...prev, status: 'in_progress'} : null);
        }
      });
  };
  
  const completeRide = () => {
    if (!currentRide) return;
    
    setIsRideTimerActive(false);
    updateRideStatus(currentRide.id, 'completed', { ride_time: rideTimer })
      .then(({ success, error }) => {
        if (!success) {
          toast({
            title: "Error",
            description: error || "Failed to complete ride",
            duration: 3000
          });
        } else {
          const completedRide: Ride = {
            ...currentRide, 
            status: 'completed', 
            endTime: new Date().toISOString()
          };
          setCurrentRide(completedRide);
          setRideHistory(prev => [completedRide, ...prev]);
          
          if (isDriverMode && currentRide.price) {
            updateWalletBalance(Math.round(currentRide.price * 0.8));
          } else if (!isDriverMode && currentRide.price) {
            if (currentRide.paymentMethod !== 'wallet') {
              updateWalletBalance(-currentRide.price);
            }
          }
        }
      });
  };
  
  const cancelRide = () => {
    if (!currentRide) return;
    
    updateRideStatus(currentRide.id, 'cancelled')
      .then(({ success, error }) => {
        if (!success) {
          toast({
            title: "Error",
            description: error || "Failed to cancel ride",
            duration: 3000
          });
        } else {
          setCurrentRide(null);
          setIsRideTimerActive(false);
          setRideTimer(0);
          setPickupLocation(null);
          setDropoffLocation(null);
          setSelectedRideOption(null);
          setUserBid(null);
          setPanelOpen(false);
        }
      });
  };
  
  const updateWalletBalance = (amount: number) => {
    setWalletBalance(prev => prev + amount);
  };
  
  return (
    <RideContext.Provider
      value={{
        pickup,
        setPickup,
        dropoff,
        setDropoff,
        selectedOption,
        setSelectedOption,
        isDriverMode,
        setDriverMode,
        pendingRideRequests,
        setPendingRideRequests,
        
        pickupLocation,
        dropoffLocation,
        setPickupLocation,
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
        currentRide,
        setCurrentRide,
        rideTimer,
        isRideTimerActive,
        walletBalance,
        acceptRideRequest,
        startRide,
        completeRide,
        cancelRide,
        updateWalletBalance,
        rideHistory,
        transactions
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
