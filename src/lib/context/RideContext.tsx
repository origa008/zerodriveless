
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Define types
export type Location = {
  name: string;
  address?: string;
  coordinates?: [number, number]; // [longitude, latitude]
};

export type RideOption = {
  id: string;
  name: string;
  type: string;
  image?: string;
  description?: string;
  basePrice: number;
};

export type PaymentMethod = 'cash' | 'wallet';

export type Ride = {
  id: string;
  pickup: Location;
  dropoff: Location;
  rideOption: RideOption;
  price: number;
  distance: number;
  duration: number;
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  paymentMethod: PaymentMethod;
  currency: string;
  driver?: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    licensePlate?: string;
  };
};

// Create a new ride request
const createNewRideRequest = async ({
  passengerId,
  pickupLocation,
  dropoffLocation,
  bidAmount,
  vehicleType,
  estimatedDistance,
  estimatedDuration,
  paymentMethod
}: {
  passengerId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  bidAmount: number;
  vehicleType: string;
  estimatedDistance: number;
  estimatedDuration: number;
  paymentMethod: PaymentMethod;
}) => {
  try {
    console.log('Creating a new ride with:', {
      passenger_id: passengerId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      bid_amount: bidAmount,
      ride_option: { name: vehicleType, type: vehicleType },
      price: bidAmount,
      distance: estimatedDistance,
      duration: estimatedDuration,
      payment_method: paymentMethod,
      status: 'searching',
      currency: 'RS'
    });

    const { data: ride, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        bid_amount: bidAmount,
        ride_option: { name: vehicleType, type: vehicleType },
        price: bidAmount,
        distance: estimatedDistance,
        duration: estimatedDuration,
        payment_method: paymentMethod,
        status: 'searching',
        currency: 'RS'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ride request:', error);
      throw new Error(error.message);
    }

    console.log('Created ride:', ride);
    
    // Set up a subscription for this specific ride
    const channel = supabase
      .channel(`ride_${ride.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${ride.id}`
      }, (payload) => {
        console.log('Ride status updated:', payload.new);
        // Handle any status updates
      })
      .subscribe();

    const unsubscribe = () => {
      channel.unsubscribe();
    };

    return { data: ride, error: null, unsubscribe };
  } catch (error: any) {
    console.error('Error in createNewRideRequest:', error);
    return { data: null, error: error.message, unsubscribe: () => {} };
  }
};

// Fetch ride requests
const fetchRideRequests = async (user: any) => {
  if (!user?.id) return [];
  
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching ride requests:', error);
    return [];
  }
};

// Define the context type
type RideContextType = {
  pickupLocation: Location | null;
  setPickupLocation: (location: Location | null) => void;
  dropoffLocation: Location | null;
  setDropoffLocation: (location: Location | null) => void;
  availableRideOptions: RideOption[];
  selectedRideOption: RideOption | null;
  setSelectedRideOption: (option: RideOption | null) => void;
  currentRide: Ride | null;
  setCurrentRide: (ride: Ride | null) => void;
  isDriverMode: boolean;
  setDriverMode: (isDriverMode: boolean) => void;
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
  findRides: () => void;
  confirmRide: () => Promise<void>;
  acceptRideRequest: (rideId: string) => void;
  isSearchingRides: boolean;
  estimatedDistance: number;
  estimatedDuration: number;
  calculateBaseFare: (distanceInKm: number, vehicleType: string) => number;
  userBid: number;
  setUserBid: (bid: number) => void;
  isWaitingForDriverAcceptance: boolean;
  setWaitingForDriverAcceptance: (isWaiting: boolean) => void;
  driverAcceptanceTimer: number;
  resetDriverAcceptanceTimer: () => void;
  pendingRideRequests: any[];
  setPendingRideRequests: (rides: any[]) => void;
  rideTimer: number;
  startRideTimer: () => void;
  stopRideTimer: () => void;
  isRideTimerActive: boolean;
  walletBalance: number;
  setWalletBalance: (balance: number) => void;
};

// Create the context with default values
const RideContext = createContext<RideContextType>({
  pickupLocation: null,
  setPickupLocation: () => {},
  dropoffLocation: null,
  setDropoffLocation: () => {},
  availableRideOptions: [],
  selectedRideOption: null,
  setSelectedRideOption: () => {},
  currentRide: null,
  setCurrentRide: () => {},
  isDriverMode: false,
  setDriverMode: () => {},
  isPanelOpen: true,
  setPanelOpen: () => {},
  findRides: () => {},
  confirmRide: async () => {},
  acceptRideRequest: () => {},
  isSearchingRides: false,
  estimatedDistance: 0,
  estimatedDuration: 0,
  calculateBaseFare: () => 0,
  userBid: 0,
  setUserBid: () => {},
  isWaitingForDriverAcceptance: false,
  setWaitingForDriverAcceptance: () => {},
  driverAcceptanceTimer: 60,
  resetDriverAcceptanceTimer: () => {},
  pendingRideRequests: [],
  setPendingRideRequests: () => {},
  rideTimer: 0,
  startRideTimer: () => {},
  stopRideTimer: () => {},
  isRideTimerActive: false,
  walletBalance: 0,
  setWalletBalance: () => {}
});

// Create the provider component
export const RideProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State for locations
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  
  // State for ride options
  const [availableRideOptions, setAvailableRideOptions] = useState<RideOption[]>([
    {
      id: 'car',
      name: 'Car',
      type: 'car',
      image: '/car-icon.png',
      basePrice: 200
    },
    {
      id: 'bike',
      name: 'Bike',
      type: 'bike',
      image: '/bike-icon.png',
      basePrice: 100
    },
    {
      id: 'auto',
      name: 'Auto',
      type: 'auto',
      image: '/auto-icon.png',
      basePrice: 150
    }
  ]);
  
  const [selectedRideOption, setSelectedRideOption] = useState<RideOption | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [isDriverMode, setDriverMode] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(true);
  const [isSearchingRides, setIsSearchingRides] = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [userBid, setUserBid] = useState(0);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState(60);
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [rideTimer, setRideTimer] = useState(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Calculate the base fare for a ride
  const calculateBaseFare = (distanceInKm: number, vehicleType: string): number => {
    // Find the vehicle type in available options
    const vehicle = availableRideOptions.find(opt => opt.type === vehicleType.toLowerCase());
    
    // Base price for the vehicle type or default to 100
    const basePrice = vehicle?.basePrice || 100;
    
    // Calculate fare based on distance
    let fare = basePrice + (distanceInKm * 20);
    
    // Ensure minimum fare
    fare = Math.max(fare, basePrice);
    
    // Round to nearest 10
    return Math.ceil(fare / 10) * 10;
  };
  
  // Reset the driver acceptance timer
  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(60);
  };
  
  // Start the ride timer
  const startRideTimer = () => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    setRideTimer(0);
    setIsRideTimerActive(true);
    
    // Set up interval to increment timer every second
    const interval = setInterval(() => {
      setRideTimer(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };
  
  // Stop the ride timer
  const stopRideTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsRideTimerActive(false);
  };

  // Clean up timer interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Handle driver acceptance timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isWaitingForDriverAcceptance && driverAcceptanceTimer > 0) {
      interval = setInterval(() => {
        setDriverAcceptanceTimer(prev => prev - 1);
      }, 1000);
    } else if (driverAcceptanceTimer === 0) {
      setWaitingForDriverAcceptance(false);
      // Handle no driver acceptance
      toast({
        title: "No drivers available",
        description: "Please try again or increase your bid to find a driver faster.",
        variant: "destructive"
      });
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingForDriverAcceptance, driverAcceptanceTimer, toast]);

  // Load wallet balance
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
        console.error('Error fetching wallet balance:', error);
      }
    };
    
    fetchWalletBalance();
  }, [user?.id]);

  // Function to find available rides
  const findRides = () => {
    // Simulate finding rides with estimate calculation
    setIsSearchingRides(true);
    
    // Mock distance and duration calculation
    const mockDistance = Math.floor(Math.random() * 10) + 1; // 1-10 km
    const mockDuration = mockDistance * 2 + 5; // Estimated minutes
    
    // Set estimated values
    setEstimatedDistance(mockDistance);
    setEstimatedDuration(mockDuration);
    
    // If a ride option is selected, set the default bid amount
    if (selectedRideOption) {
      const baseFare = calculateBaseFare(mockDistance, selectedRideOption.type);
      setUserBid(baseFare);
    }
    
    // Simulate delay for finding rides
    setTimeout(() => {
      setIsSearchingRides(false);
    }, 1500);
  };
  
  // Function to confirm ride
  const confirmRide = async () => {
    if (!user?.id || !pickupLocation || !dropoffLocation || !selectedRideOption) {
      toast({
        title: "Error",
        description: "Missing required information for booking ride",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error, unsubscribe } = await createNewRideRequest({
        passengerId: user.id,
        pickupLocation,
        dropoffLocation,
        bidAmount: userBid,
        vehicleType: selectedRideOption.type,
        estimatedDistance,
        estimatedDuration,
        paymentMethod: 'cash' // Default to cash payment for now
      });
      
      if (error) {
        throw new Error(error);
      }
      
      if (data) {
        // Set the current ride
        setCurrentRide({
          id: data.id,
          pickup: pickupLocation,
          dropoff: dropoffLocation,
          rideOption: selectedRideOption,
          price: userBid,
          distance: estimatedDistance,
          duration: estimatedDuration,
          status: 'searching',
          paymentMethod: 'cash',
          currency: 'RS'
        });
        
        // Update state to waiting for driver
        setWaitingForDriverAcceptance(true);
        resetDriverAcceptanceTimer();
        
        toast({
          title: "Ride Requested",
          description: "Searching for a driver...",
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('Error confirming ride:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to book ride",
        variant: "destructive"
      });
    }
  };
  
  // Function to accept ride request (for drivers)
  const acceptRideRequest = (rideId: string) => {
    if (!user?.id || !isDriverMode) {
      toast({
        title: "Error",
        description: "Invalid driver or mode",
        variant: "destructive"
      });
      return;
    }
    
    // Update the ride with the driver ID
    supabase
      .from('rides')
      .update({
        driver_id: user.id,
        status: 'confirmed',
        start_time: new Date().toISOString()
      })
      .eq('id', rideId)
      .eq('status', 'searching')
      .then(({ error }) => {
        if (error) {
          console.error('Error accepting ride:', error);
          toast({
            title: "Error",
            description: "Failed to accept ride",
            variant: "destructive"
          });
          return;
        }
        
        // Update local state
        setPendingRideRequests(prevRequests => 
          prevRequests.filter(req => req.id !== rideId)
        );
        
        toast({
          title: "Ride Accepted",
          description: "You've accepted the ride",
          duration: 3000
        });
      });
  };
  
  // Fetch initial ride requests if in driver mode
  useEffect(() => {
    if (isDriverMode && user?.id) {
      const loadRideRequests = async () => {
        const rides = await fetchRideRequests(user);
        setPendingRideRequests(rides);
      };
      
      loadRideRequests();
    }
  }, [isDriverMode, user]);

  const value = {
    pickupLocation,
    setPickupLocation,
    dropoffLocation,
    setDropoffLocation,
    availableRideOptions,
    selectedRideOption,
    setSelectedRideOption,
    currentRide,
    setCurrentRide,
    isDriverMode,
    setDriverMode,
    isPanelOpen,
    setPanelOpen,
    findRides,
    confirmRide,
    acceptRideRequest,
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
    pendingRideRequests,
    setPendingRideRequests,
    rideTimer,
    startRideTimer,
    stopRideTimer,
    isRideTimerActive,
    walletBalance,
    setWalletBalance
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
};

// Create and export the custom hook
export const useRide = () => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
