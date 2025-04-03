import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ride, Location, RideOption, Driver, PaymentMethod, User } from '../types';
import { calculateDistance } from '../utils/mapsApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { 
  createRideRequest, 
  acceptRideRequest as acceptRide,
  getAvailableRideRequests,
  subscribeToNewRideRequests,
  subscribeToRideUpdates,
  updateRideStatus
} from '../utils/rideUtils';
import { getWalletBalance, subscribeToWalletBalance } from '../utils/walletUtils';

type RideContextType = {
  currentRide: Ride | null;
  setCurrentRide: React.Dispatch<React.SetStateAction<Ride | null>>;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  availableRideOptions: RideOption[];
  selectedRideOption: RideOption | null;
  setSelectedRideOption: (option: RideOption | null) => void;
  findRides: () => void;
  confirmRide: (paymentMethod?: PaymentMethod) => void;
  startRide: () => void;
  completeRide: () => void;
  cancelRide: () => void;
  rideTimer: number;
  isRideTimerActive: boolean;
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
  isDriverMode: boolean;
  setDriverMode: (isDriver: boolean) => void;
  isSearchingRides: boolean;
  estimatedDistance: number | null;
  estimatedDuration: number | null;
  rideHistory: Ride[];
  addToHistory: (ride: Ride) => void;
  fareMultiplier: number;
  updateFareMultiplier: () => void;
  userBid: number | null;
  setUserBid: (bid: number | null) => void;
  calculateBaseFare: (distance: number, vehicleType: string) => number;
  isWaitingForDriverAcceptance: boolean;
  setWaitingForDriverAcceptance: (isWaiting: boolean) => void;
  driverAcceptanceTimer: number;
  resetDriverAcceptanceTimer: () => void;
  walletBalance: number;
  updateWalletBalance: (amount: number) => void;
  pendingRideRequests: Ride[];
  addRideRequest: (ride: Ride) => void;
  removeRideRequest: (rideId: string) => void;
  acceptRideRequest: (rideId: string) => void;
};

const defaultRideOptions: RideOption[] = [
  {
    id: '1',
    name: 'Bike',
    image: '/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png',
    price: 120,
    currency: 'RS',
    duration: 3,
    capacity: 1
  },
  {
    id: '2',
    name: 'Auto',
    image: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png',
    price: 210,
    currency: 'RS',
    duration: 3,
    capacity: 3
  }
];

const defaultDriver: Driver = {
  id: '1',
  name: 'John Smith',
  rating: 4.8,
  licensePlate: 'ABC-123',
  avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
};

const defaultLocation: Location = {
  name: 'Lahore, Pakistan',
  address: 'Lahore, Punjab, Pakistan',
  coordinates: [74.3587, 31.5204] // [longitude, latitude]
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [selectedRideOption, setSelectedRideOption] = useState<RideOption | null>(null);
  const [rideTimer, setRideTimer] = useState<number>(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState<boolean>(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);
  const [isDriverMode, setDriverMode] = useState<boolean>(false);
  const [isSearchingRides, setIsSearchingRides] = useState<boolean>(false);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [availableRideOptionsWithPricing, setAvailableRideOptionsWithPricing] = useState<RideOption[]>(defaultRideOptions);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [fareMultiplier, setFareMultiplier] = useState<number>(1);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState<boolean>(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState<number>(60); // 60 seconds = 1 minute
  const [driverAcceptanceInterval, setDriverAcceptanceInterval] = useState<NodeJS.Timeout | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [pendingRideRequests, setPendingRideRequests] = useState<Ride[]>([]);

  const availableRideOptions = availableRideOptionsWithPricing;

  useEffect(() => {
    if (!pickupLocation) {
      setPickupLocation(defaultLocation);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      const fetchWalletBalance = async () => {
        const { balance } = await getWalletBalance(user.id);
        setWalletBalance(balance);
      };
      
      fetchWalletBalance();
      
      const unsubscribe = subscribeToWalletBalance(user.id, (newBalance) => {
        setWalletBalance(newBalance);
      });
      
      return () => unsubscribe();
    }
  }, [user?.id]);

  useEffect(() => {
    if (isDriverMode && user?.isVerifiedDriver) {
      const fetchAvailableRides = async () => {
        const { rides } = await getAvailableRideRequests();
        setPendingRideRequests(rides.map(rideData => ({
          id: rideData.id,
          pickup: rideData.pickup_location,
          dropoff: rideData.dropoff_location,
          rideOption: rideData.ride_option,
          status: rideData.status,
          price: rideData.price,
          currency: rideData.currency,
          distance: rideData.distance,
          duration: rideData.duration,
          paymentMethod: rideData.payment_method
        })));
      };
      
      fetchAvailableRides();
      
      const unsubscribe = subscribeToNewRideRequests((newRide) => {
        const ride: Ride = {
          id: newRide.id,
          pickup: newRide.pickup_location,
          dropoff: newRide.dropoff_location,
          rideOption: newRide.ride_option,
          status: newRide.status,
          price: newRide.price,
          currency: newRide.currency,
          distance: newRide.distance,
          duration: newRide.duration,
          paymentMethod: newRide.payment_method
        };
        
        setPendingRideRequests(prev => [ride, ...prev]);
      });
      
      return () => unsubscribe();
    }
  }, [isDriverMode, user?.isVerifiedDriver]);

  const updateWalletBalance = (amount: number) => {
    setWalletBalance(prevBalance => {
      const newBalance = prevBalance + amount;
      localStorage.setItem('walletBalance', newBalance.toString());
      return newBalance;
    });
  };

  const addRideRequest = (ride: Ride) => {
    setPendingRideRequests(prev => [...prev, ride]);
  };

  const removeRideRequest = (rideId: string) => {
    setPendingRideRequests(prev => prev.filter(ride => ride.id !== rideId));
  };

  const acceptRideRequest = async (rideId: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to accept rides",
        duration: 3000
      });
      return;
    }
    
    const { success, error } = await acceptRide(rideId, user.id);
    
    if (success) {
      removeRideRequest(rideId);
      
      const acceptedRide = pendingRideRequests.find(ride => ride.id === rideId);
      if (acceptedRide) {
        setCurrentRide(acceptedRide);
      }
      
      toast({
        title: "Ride accepted",
        description: "You have accepted this ride request",
        duration: 3000
      });
    } else {
      toast({
        title: "Error accepting ride",
        description: error || "Failed to accept ride request",
        duration: 3000
      });
    }
  };

  const calculateBaseFare = (distance: number, vehicleType: string): number => {
    const baseRate = vehicleType === 'Bike' ? 10 : 17; // RS per km
    const driverProfit = 1.25; // 25% profit for driver
    return Math.round(distance * baseRate * driverProfit * fareMultiplier);
  };

  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(60);
    if (driverAcceptanceInterval) {
      clearInterval(driverAcceptanceInterval);
      setDriverAcceptanceInterval(null);
    }
  };

  useEffect(() => {
    if (isWaitingForDriverAcceptance && driverAcceptanceTimer > 0) {
      const interval = setInterval(() => {
        setDriverAcceptanceTimer((prev) => {
          if (prev <= 1) {
            setWaitingForDriverAcceptance(false);
            clearInterval(interval);
            toast({
              title: "Driver didn't accept",
              description: "Please try increasing your bid to find a driver faster.",
              duration: 5000
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setDriverAcceptanceInterval(interval);
      return () => clearInterval(interval);
    }
  }, [isWaitingForDriverAcceptance, driverAcceptanceTimer, toast]);

  const updateFareMultiplier = () => {
    const hour = new Date().getHours();
    let timeMultiplier = 1;
    
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
      timeMultiplier = 1.2;
    }
    
    const day = new Date().getDay();
    const isWeekend = (day === 5 && hour >= 20) || (day === 6 && hour >= 18);
    const weekendMultiplier = isWeekend ? 1.15 : 1;
    
    const demandMultiplier = 1 + (Math.random() * 0.25);
    
    const newMultiplier = timeMultiplier * weekendMultiplier * demandMultiplier;
    
    setFareMultiplier(parseFloat(newMultiplier.toFixed(2)));
  };

  useEffect(() => {
    updateFareMultiplier();
    const intervalId = setInterval(updateFareMultiplier, 10 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const calculateDistanceAndDuration = async () => {
      if (
        pickupLocation?.coordinates && 
        dropoffLocation?.coordinates
      ) {
        const result = await calculateDistance(
          pickupLocation.coordinates,
          dropoffLocation.coordinates
        );
        
        if (result) {
          setEstimatedDistance(parseFloat(result.distance.toFixed(1)));
          setEstimatedDuration(result.duration);
          
          const updatedOptions = defaultRideOptions.map(option => {
            const baseFare = calculateBaseFare(result.distance, option.name);
            
            return {
              ...option,
              price: baseFare,
              duration: result.duration
            };
          });
          
          setAvailableRideOptionsWithPricing(updatedOptions);
        }
      }
    };

    calculateDistanceAndDuration();
  }, [pickupLocation?.coordinates, dropoffLocation?.coordinates, fareMultiplier]);

  useEffect(() => {
    if (isRideTimerActive && currentRide?.status === 'in_progress') {
      const interval = setInterval(() => {
        setRideTimer((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    if (rideTimer >= 120 && currentRide?.status === 'in_progress') {
      completeRide();
    }
  }, [isRideTimerActive, rideTimer, currentRide?.status]);

  const addToHistory = (ride: Ride) => {
    setRideHistory(prev => [ride, ...prev]);
  };

  const findRides = async () => {
    if (!pickupLocation || !dropoffLocation) {
      console.error('Pickup and dropoff locations are required');
      return;
    }
    
    setIsSearchingRides(true);
    
    setTimeout(() => {
      setIsSearchingRides(false);
      setPanelOpen(true);
    }, 1500);
  };

  const confirmRide = async (paymentMethod: PaymentMethod = 'cash') => {
    if (!pickupLocation || !dropoffLocation || !selectedRideOption || !user?.id) {
      console.error('Pickup, dropoff, ride option, and user are required');
      return;
    }

    const finalPrice = userBid || selectedRideOption.price;

    try {
      const { rideId, error } = await createRideRequest(
        user.id,
        pickupLocation,
        dropoffLocation,
        selectedRideOption,
        finalPrice,
        estimatedDistance || 4.8,
        estimatedDuration || 15,
        paymentMethod
      );
      
      if (error) throw new Error(error);
      
      if (!rideId) throw new Error("Failed to create ride request");
      
      const newRide: Ride = {
        id: rideId,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        rideOption: {
          ...selectedRideOption,
          price: finalPrice
        },
        status: 'searching',
        price: finalPrice,
        currency: selectedRideOption.currency,
        distance: estimatedDistance || 4.8,
        duration: estimatedDuration || 15,
        paymentMethod: paymentMethod
      };

      setCurrentRide(newRide);
      setPanelOpen(false);
      setWaitingForDriverAcceptance(true);
      resetDriverAcceptanceTimer();

      toast({
        title: "Looking for drivers",
        description: "Waiting for a driver to accept your bid. This will take about a minute.",
        duration: 5000
      });
      
      const unsubscribe = subscribeToRideUpdates(rideId, (updatedRide) => {
        if (updatedRide.status !== 'searching') {
          setWaitingForDriverAcceptance(false);
          
          const driver: Driver = {
            id: updatedRide.driver_id,
            name: "Your Driver",
            rating: 4.8,
            licensePlate: "ABC-123",
            avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
          };
          
          const updatedRideObject: Ride = {
            ...newRide,
            driver,
            status: updatedRide.status
          };
          
          setCurrentRide(updatedRideObject);
          
          toast({
            title: "Driver found!",
            description: "A driver has accepted your ride request",
            duration: 3000
          });
        }
      });
      
      setTimeout(() => {
        unsubscribe();
      }, 10 * 60 * 1000);
      
    } catch (error: any) {
      console.error("Error confirming ride:", error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm ride",
        duration: 3000
      });
    }
  };

  const startRide = async () => {
    if (!currentRide) return;
    
    try {
      const { success, error } = await updateRideStatus(
        currentRide.id, 
        'in_progress'
      );
      
      if (error) throw new Error(error);
      
      const updatedRide: Ride = {
        ...currentRide,
        status: 'in_progress',
        startTime: new Date()
      };
      
      setCurrentRide(updatedRide);
      setRideTimer(0);
      setIsRideTimerActive(true);
    } catch (error: any) {
      console.error("Error starting ride:", error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to start ride",
        duration: 3000
      });
    }
  };

  const completeRide = async () => {
    if (!currentRide) return;
    
    try {
      const { success, error } = await updateRideStatus(
        currentRide.id, 
        'completed', 
        { end_time: new Date() }
      );
      
      if (error) throw new Error(error);
      
      const updatedRide: Ride = {
        ...currentRide,
        status: 'completed',
        endTime: new Date()
      };
      
      setCurrentRide(updatedRide);
      setIsRideTimerActive(false);
      
      addToHistory(updatedRide);

      if (isDriverMode) {
        updateWalletBalance(updatedRide.price);
        toast({
          title: "Ride completed",
          description: `You earned RS ${updatedRide.price} for this ride.`,
          duration: 3000
        });
      } else if (updatedRide.paymentMethod === 'wallet') {
        updateWalletBalance(-updatedRide.price);
        toast({
          title: "Ride completed",
          description: `RS ${updatedRide.price} has been deducted from your wallet.`,
          duration: 3000
        });
      } else {
        toast({
          title: "Ride completed",
          description: `Please pay RS ${updatedRide.price} in cash to your driver.`,
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error("Error completing ride:", error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to complete ride",
        duration: 3000
      });
    }
  };

  const cancelRide = async () => {
    if (!currentRide) return;
    
    try {
      const { success, error } = await updateRideStatus(
        currentRide.id, 
        'cancelled'
      );
      
      if (error) throw new Error(error);
      
      const updatedRide: Ride = {
        ...currentRide,
        status: 'cancelled'
      };
      
      setCurrentRide(updatedRide);
      setIsRideTimerActive(false);
      setWaitingForDriverAcceptance(false);
      
      addToHistory(updatedRide);

      if (!isDriverMode) {
        removeRideRequest(currentRide.id);
      }

      toast({
        title: "Ride cancelled",
        description: "Your ride has been cancelled.",
        duration: 3000
      });
    } catch (error: any) {
      console.error("Error cancelling ride:", error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ride",
        duration: 3000
      });
    }
  };

  const contextValue: RideContextType = {
    currentRide,
    setCurrentRide,
    pickupLocation,
    dropoffLocation,
    setPickupLocation,
    setDropoffLocation,
    availableRideOptions,
    selectedRideOption,
    setSelectedRideOption,
    findRides,
    confirmRide,
    startRide,
    completeRide,
    cancelRide,
    rideTimer,
    isRideTimerActive,
    isPanelOpen,
    setPanelOpen,
    isDriverMode,
    setDriverMode,
    isSearchingRides,
    estimatedDistance,
    estimatedDuration,
    rideHistory,
    addToHistory,
    fareMultiplier,
    updateFareMultiplier,
    userBid,
    setUserBid,
    calculateBaseFare,
    isWaitingForDriverAcceptance,
    setWaitingForDriverAcceptance,
    driverAcceptanceTimer,
    resetDriverAcceptanceTimer,
    walletBalance,
    updateWalletBalance,
    pendingRideRequests,
    addRideRequest,
    removeRideRequest,
    acceptRideRequest
  };

  return (
    <RideContext.Provider value={contextValue}>
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
