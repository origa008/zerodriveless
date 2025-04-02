import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ride, Location, RideOption, Driver, PaymentMethod } from '../types';
import { calculateDistance } from '../utils/mapsApi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
  confirmRide: (paymentMethod?: PaymentMethod) => Promise<void>;
  startRide: () => Promise<void>;
  completeRide: () => Promise<void>;
  cancelRide: () => Promise<void>;
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
  updateWalletBalance: (amount: number) => Promise<void>;
  fetchWalletBalance: () => Promise<void>;
  pendingRideRequests: Ride[];
  addRideRequest: (ride: Ride) => void;
  removeRideRequest: (rideId: string) => void;
  acceptRideRequest: (rideId: string) => void;
  fetchRideHistory: () => Promise<void>;
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

// Default location for Lahore, Pakistan
const defaultLocation: Location = {
  name: 'Lahore, Pakistan',
  address: 'Lahore, Punjab, Pakistan',
  coordinates: [74.3587, 31.5204] // [longitude, latitude]
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { user, session } = useAuth();
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

  // Initialize with default location for Lahore
  useEffect(() => {
    if (!pickupLocation) {
      setPickupLocation(defaultLocation);
    }
  }, []);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching wallet balance:', error);
        return;
      }
      
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error('Exception fetching wallet balance:', error);
    }
  };

  // Update wallet balance
  const updateWalletBalance = async (amount: number) => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to manage your wallet",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create transaction record
      const transactionType = amount > 0 ? 'deposit' : 'withdrawal';
      
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: session.user.id,
          amount: Math.abs(amount),
          type: transactionType,
          status: 'completed',
          description: `${transactionType} of RS ${Math.abs(amount)}`
        })
        .select();
      
      if (transactionError) {
        throw transactionError;
      }
      
      // Update wallet balance
      if (amount > 0) {
        // Add to wallet
        await supabase.rpc('add_to_wallet', {
          user_id: session.user.id,
          amount: amount
        });
      } else {
        // Deduct from wallet
        const success = await supabase.rpc('deduct_from_wallet', {
          user_id: session.user.id,
          amount: Math.abs(amount)
        });
        
        if (!success) {
          throw new Error('Insufficient balance');
        }
      }
      
      // Update local state
      await fetchWalletBalance();
      
      toast({
        title: amount > 0 ? "Money added" : "Withdrawal successful",
        description: `RS ${Math.abs(amount)} has been ${amount > 0 ? 'added to' : 'withdrawn from'} your wallet.`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Wallet update failed:', error);
      toast({
        title: "Transaction failed",
        description: error.message || "Failed to update wallet balance",
        variant: "destructive"
      });
    }
  };

  // Initialize wallet balance when user logs in
  useEffect(() => {
    if (session?.user) {
      fetchWalletBalance();
      fetchRideHistory();
    }
  }, [session?.user]);

  // Fetch ride history from Supabase
  const fetchRideHistory = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:passenger_id(id, name, avatar, phone),
          driver:driver_id(id, name, avatar, phone)
        `)
        .or(`passenger_id.eq.${session.user.id},driver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching ride history:', error);
        return;
      }
      
      if (data) {
        // Transform the data to match the Ride type
        const transformedRides = data.map(ride => ({
          id: ride.id,
          pickup: ride.pickup_location as unknown as Location,
          dropoff: ride.dropoff_location as unknown as Location,
          rideOption: ride.ride_option,
          status: ride.status as RideStatus,
          price: ride.price,
          currency: ride.currency,
          distance: ride.distance,
          duration: ride.duration,
          startTime: ride.start_time,
          endTime: ride.end_time,
          paymentMethod: ride.payment_method as PaymentMethod,
          passenger: ride.passenger,
          driver: ride.driver,
        }));
        
        setRideHistory(transformedRides);
      }
    } catch (error) {
      console.error('Exception fetching ride history:', error);
    }
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
    if (!pickupLocation || !dropoffLocation || !selectedRideOption || !session?.user?.id) {
      console.error('Pickup, dropoff, ride option, and user are required');
      toast({
        title: "Error confirming ride",
        description: "Please try again or log in if you're not logged in",
        variant: "destructive"
      });
      return;
    }

    // Use user bid if available, otherwise use the selected ride option price
    const finalPrice = userBid || selectedRideOption.price;

    // Create ride record in database
    try {
      const { data: newRideData, error: newRideError } = await supabase
        .from('rides')
        .insert({
          passenger_id: session.user.id,
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation,
          ride_option: selectedRideOption,
          price: finalPrice,
          currency: selectedRideOption.currency,
          distance: estimatedDistance || 4.8,
          duration: estimatedDuration || 15,
          payment_method: paymentMethod,
          status: 'confirmed'
        })
        .select()
        .single();
      
      if (newRideError) {
        throw newRideError;
      }
      
      // Format the new ride data for the frontend
      const newRide: Ride = {
        id: newRideData.id,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        rideOption: {
          ...selectedRideOption,
          price: finalPrice
        },
        status: 'confirmed',
        price: finalPrice,
        currency: selectedRideOption.currency,
        distance: estimatedDistance || 4.8,
        duration: estimatedDuration || 15,
        paymentMethod: paymentMethod,
        passenger: {
          id: session.user.id,
          name: user?.name || 'Passenger',
          avatar: user?.avatar || '',
          phone: user?.phone || ''
        }
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
      
      // Refresh ride history
      fetchRideHistory();
      
    } catch (error: any) {
      console.error('Error confirming ride:', error);
      toast({
        title: "Error confirming ride",
        description: error.message || "Failed to confirm your ride",
        variant: "destructive"
      });
    }
  };

  const startRide = async () => {
    if (!currentRide || !session?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'in_progress',
          start_time: new Date().toISOString(),
          driver_id: isDriverMode ? session.user.id : currentRide.driver?.id
        })
        .eq('id', currentRide.id);
      
      if (error) {
        throw error;
      }
      
      const updatedRide: Ride = {
        ...currentRide,
        status: 'in_progress',
        startTime: new Date()
      };
      
      setCurrentRide(updatedRide);
      setRideTimer(0);
      setIsRideTimerActive(true);
      
      toast({
        title: "Ride started",
        description: "Your ride is now in progress.",
        duration: 3000
      });
      
      // Refresh ride history
      fetchRideHistory();
      
    } catch (error: any) {
      console.error('Error starting ride:', error);
      toast({
        title: "Error starting ride",
        description: error.message || "Failed to start your ride",
        variant: "destructive"
      });
    }
  };

  const completeRide = async () => {
    if (!currentRide || !session?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', currentRide.id);
      
      if (error) {
        throw error;
      }
      
      const updatedRide: Ride = {
        ...currentRide,
        status: 'completed',
        endTime: new Date()
      };
      
      setCurrentRide(updatedRide);
      setIsRideTimerActive(false);
      
      // Add to ride history
      addToHistory(updatedRide);

      // Handle payment
      if (isDriverMode) {
        // Driver earns the fare
        await updateWalletBalance(updatedRide.price);
        
        toast({
          title: "Ride completed",
          description: `You earned RS ${updatedRide.price} for this ride.`,
          duration: 3000
        });
      } else if (updatedRide.paymentMethod === 'wallet') {
        // Passenger pays from wallet
        await updateWalletBalance(-updatedRide.price);
        
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
      
      // Refresh ride history
      fetchRideHistory();
      
    } catch (error: any) {
      console.error('Error completing ride:', error);
      toast({
        title: "Error completing ride",
        description: error.message || "Failed to complete your ride",
        variant: "destructive"
      });
    }
  };

  const cancelRide = async () => {
    if (!currentRide) return;
    
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'cancelled'
        })
        .eq('id', currentRide.id);
      
      if (error) {
        throw error;
      }
      
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
      
      // Refresh ride history
      fetchRideHistory();
      
    } catch (error: any) {
      console.error('Error cancelling ride:', error);
      toast({
        title: "Error cancelling ride",
        description: error.message || "Failed to cancel your ride",
        variant: "destructive"
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
    fetchWalletBalance,
    pendingRideRequests,
    addRideRequest,
    removeRideRequest,
    acceptRideRequest,
    fetchRideHistory
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
