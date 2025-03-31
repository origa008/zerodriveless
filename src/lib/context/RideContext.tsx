
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ride, Location, RideOption, Driver } from '../types';
import { calculateDistance } from '../utils/mapsApi';
import { useToast } from '@/hooks/use-toast';

type RideContextType = {
  currentRide: Ride | null;
  setCurrentRide: React.Dispatch<React.SetStateAction<Ride | null>>;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  handlePickupChange: (value: string) => void;
  handleDropoffChange: (value: string) => void;
  handlePickupSelect: (location: Location) => void;
  handleDropoffSelect: (location: Location) => void;
  availableRideOptions: RideOption[];
  selectedRideOption: RideOption | null;
  setSelectedRideOption: (option: RideOption | null) => void;
  findRides: () => void;
  confirmRide: () => void;
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
  paymentMethod: 'cash' | 'wallet';
  setPaymentMethod: (method: 'cash' | 'wallet') => void;
};

const defaultRideOptions: RideOption[] = [
  {
    id: '1',
    name: 'Bike',
    image: '/lovable-uploads/debf7624-f989-4b17-a657-b4eb13735f8b.png',
    price: 120,
    currency: 'RS',
    duration: 3,
    capacity: 1
  },
  {
    id: '2',
    name: 'Auto',
    image: '/lovable-uploads/413bd9ac-22fa-4c69-aa6c-991edcf8f3ff.png',
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

// Default location for Lahore, Pakistan
const defaultLocation: Location = {
  name: 'Lahore, Pakistan',
  address: 'Lahore, Punjab, Pakistan',
  coordinates: [74.3587, 31.5204] // [longitude, latitude] for Lahore
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(defaultLocation);
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');

  const availableRideOptions = availableRideOptionsWithPricing;

  // Initialize wallet balance from localStorage if available
  useEffect(() => {
    const storedBalance = localStorage.getItem('walletBalance');
    if (storedBalance) {
      setWalletBalance(parseFloat(storedBalance));
    }
    
    // Initialize ride history from localStorage if available
    const storedHistory = localStorage.getItem('rideHistory');
    if (storedHistory) {
      setRideHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Simple handlers for location inputs
  const handlePickupChange = (value: string) => {
    // Placeholder for input change handler
  };

  const handleDropoffChange = (value: string) => {
    // Placeholder for input change handler
  };

  const handlePickupSelect = (location: Location) => {
    setPickupLocation(location);
  };

  const handleDropoffSelect = (location: Location) => {
    setDropoffLocation(location);
  };
  
  // Update wallet balance
  const updateWalletBalance = (amount: number) => {
    setWalletBalance(prevBalance => {
      const newBalance = prevBalance + amount;
      // Store in local storage for persistence
      localStorage.setItem('walletBalance', newBalance.toString());
      return newBalance;
    });
  };

  // Add a new ride request
  const addRideRequest = (ride: Ride) => {
    setPendingRideRequests(prev => [...prev, ride]);
  };

  // Remove a ride request
  const removeRideRequest = (rideId: string) => {
    setPendingRideRequests(prev => prev.filter(ride => ride.id !== rideId));
  };

  // Accept a ride request
  const acceptRideRequest = (rideId: string) => {
    const acceptedRide = pendingRideRequests.find(ride => ride.id === rideId);
    if (acceptedRide) {
      setCurrentRide(acceptedRide);
      removeRideRequest(rideId);
    }
  };

  // Calculate base fare based on vehicle type and distance
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

  // Start driver acceptance countdown
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

  // Calculate fare multiplier based on time of day, traffic, demand
  const updateFareMultiplier = () => {
    // Check current hour to determine peak time
    const hour = new Date().getHours();
    let timeMultiplier = 1;
    
    // Peak hours: 7-10 AM and 5-8 PM
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
      timeMultiplier = 1.2;
    }
    
    // Weekend multiplier (Friday and Saturday nights)
    const day = new Date().getDay(); // 0-6, 5 is Friday, 6 is Saturday
    const isWeekend = (day === 5 && hour >= 20) || (day === 6 && hour >= 18);
    const weekendMultiplier = isWeekend ? 1.15 : 1;
    
    // Random demand factor (1.0 - 1.25)
    const demandMultiplier = 1 + (Math.random() * 0.25);
    
    // Combine all factors
    const newMultiplier = timeMultiplier * weekendMultiplier * demandMultiplier;
    
    // Round to 2 decimal places
    setFareMultiplier(parseFloat(newMultiplier.toFixed(2)));
  };

  useEffect(() => {
    // Update fare multiplier when component mounts and every 10 minutes
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
          
          // Apply new fare calculation based on vehicle type
          const updatedOptions = defaultRideOptions.map(option => {
            // Calculate base fare based on vehicle type (Bike or Auto)
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
    const updatedHistory = [ride, ...rideHistory];
    setRideHistory(updatedHistory);
    localStorage.setItem('rideHistory', JSON.stringify(updatedHistory));
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

  const confirmRide = () => {
    if (!pickupLocation || !dropoffLocation || !selectedRideOption) {
      console.error('Pickup, dropoff, and ride option are required');
      return;
    }

    // Use user bid if available, otherwise use the selected ride option price
    const finalPrice = userBid || selectedRideOption.price;

    const newRide: Ride = {
      id: Math.random().toString(36).substr(2, 9),
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      rideOption: {
        ...selectedRideOption,
        price: finalPrice
      },
      driver: defaultDriver,
      status: 'confirmed',
      price: finalPrice,
      currency: selectedRideOption.currency,
      distance: estimatedDistance || 4.8,
      duration: estimatedDuration || 15,
      paymentMethod: paymentMethod
    };

    // Add ride to pending ride requests for drivers to see
    if (!isDriverMode) {
      addRideRequest(newRide);
    }

    setCurrentRide(newRide);
    setPanelOpen(false);
    setWaitingForDriverAcceptance(false);
    resetDriverAcceptanceTimer();

    toast({
      title: "Ride confirmed",
      description: "Your ride has been confirmed and is waiting for a driver.",
      duration: 3000
    });
  };

  const startRide = () => {
    if (!currentRide) return;
    
    const updatedRide: Ride = {
      ...currentRide,
      status: 'in_progress',
      startTime: new Date()
    };
    
    setCurrentRide(updatedRide);
    setRideTimer(0);
    setIsRideTimerActive(true);
  };

  const completeRide = () => {
    if (!currentRide) return;
    
    const updatedRide: Ride = {
      ...currentRide,
      status: 'completed',
      endTime: new Date()
    };
    
    setCurrentRide(updatedRide);
    setIsRideTimerActive(false);
    
    // Add to ride history
    addToHistory(updatedRide);

    // Update wallet balance
    if (isDriverMode) {
      // Driver earns the fare
      updateWalletBalance(updatedRide.price);
      toast({
        title: "Ride completed",
        description: `You earned RS ${updatedRide.price} for this ride.`,
        duration: 3000
      });
    } else if (updatedRide.paymentMethod === 'wallet') {
      // Passenger pays the fare if using wallet
      updateWalletBalance(-updatedRide.price);
      toast({
        title: "Ride completed",
        description: `RS ${updatedRide.price} has been deducted from your wallet.`,
        duration: 3000
      });
    } else {
      toast({
        title: "Ride completed",
        description: `Please pay RS ${updatedRide.price} in cash to the driver.`,
        duration: 3000
      });
    }
  };

  const cancelRide = () => {
    if (!currentRide) return;
    
    const updatedRide: Ride = {
      ...currentRide,
      status: 'cancelled'
    };
    
    setCurrentRide(updatedRide);
    setIsRideTimerActive(false);
    
    // Add to ride history
    addToHistory(updatedRide);

    // If this was a passenger cancellation, remove from pending ride requests
    if (!isDriverMode) {
      removeRideRequest(currentRide.id);
    }

    toast({
      title: "Ride cancelled",
      description: "Your ride has been cancelled.",
      duration: 3000
    });
  };

  // Provide all context values
  const contextValue: RideContextType = {
    currentRide,
    setCurrentRide,
    pickupLocation,
    dropoffLocation,
    setPickupLocation,
    setDropoffLocation,
    handlePickupChange,
    handleDropoffChange,
    handlePickupSelect,
    handleDropoffSelect,
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
    acceptRideRequest,
    paymentMethod,
    setPaymentMethod
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
