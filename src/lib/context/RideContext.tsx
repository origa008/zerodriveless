import React, { createContext, useContext, useState, useEffect } from 'react';
import { RideOption, Location, Driver, PaymentMethod, Ride } from '../types';
import { createNewRideRequest, updateRideStatus } from '../utils/dbFunctions';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMockRideOptions } from '../utils/mockData';
import { getWalletBalance, getTransactionHistory, subscribeToWalletBalance, subscribeToRideUpdates } from '../utils/walletUtils';
import { calculateDistance } from '../utils/mapsApi';
import { supabase } from '@/integrations/supabase/client';

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
  setPendingRideRequests: (requests: any[] | ((prev: any[]) => any[])) => void;
  
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
  setWalletBalance: (balance: number | ((prev: number) => number)) => void;
  
  acceptRideRequest: (rideId: string) => void;
  startRide: () => void;
  completeRide: () => void;
  cancelRide: (rideId?: string, reason?: string) => void;
  
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
  
  const findRides = async () => {
    if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
      toast({
        title: "Missing Information",
        description: "Please select pickup and dropoff locations",
        duration: 3000
      });
      return;
    }
    
    setIsSearchingRides(true);
    
    try {
      // Calculate actual distance and time using the Maps API
      const distanceResult = await calculateDistance(
        pickupLocation.coordinates,
        dropoffLocation.coordinates
      );
      
      if (!distanceResult) {
        throw new Error("Could not calculate route");
      }
      
      // Set the estimated distance and duration from API results
      setEstimatedDistance(distanceResult.distance);
      setEstimatedDuration(distanceResult.duration);
      
      // Get available ride options
      const rideOptions = getMockRideOptions();
      
      // Update ride options with calculated prices based on actual distance
      const updatedRideOptions = rideOptions.map(option => {
        const baseRate = option.name === 'Bike' ? 20 : 35;
        const calculatedPrice = Math.round(baseRate * distanceResult.distance);
        return {
          ...option,
          basePrice: calculatedPrice,
          price: calculatedPrice
        };
      });
      
      setAvailableRideOptions(updatedRideOptions);
      setIsSearchingRides(false);
      setPanelOpen(true);
      
      // Set initial userBid based on first ride option price
      if (updatedRideOptions.length > 0 && !userBid) {
        setUserBid(updatedRideOptions[0].price || 0);
      }
    } catch (error) {
      console.error("Error finding rides:", error);
      
      // Fallback to basic calculation if API fails
      if (pickupLocation.coordinates && dropoffLocation.coordinates) {
        // Use Haversine formula to calculate distance
        const [pickupLng, pickupLat] = pickupLocation.coordinates;
        const [dropoffLng, dropoffLat] = dropoffLocation.coordinates;
        
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(dropoffLat - pickupLat);
        const dLon = deg2rad(dropoffLng - pickupLng);
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(pickupLat)) * Math.cos(deg2rad(dropoffLat)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        // Estimate duration based on average speed (30 km/h for urban areas)
        const averageSpeedKmH = 30;
        const duration = Math.ceil((distance / averageSpeedKmH) * 60); // Convert to minutes
        
        setEstimatedDistance(parseFloat(distance.toFixed(1)));
        setEstimatedDuration(duration);
        
        // Get available ride options
        const rideOptions = getMockRideOptions();
        
        // Update ride options with calculated prices based on fallback distance
        const updatedRideOptions = rideOptions.map(option => {
          const baseRate = option.name === 'Bike' ? 20 : 35;
          const calculatedPrice = Math.round(baseRate * distance);
          return {
            ...option,
            basePrice: calculatedPrice,
            price: calculatedPrice
          };
        });
        
        setAvailableRideOptions(updatedRideOptions);
        setIsSearchingRides(false);
        setPanelOpen(true);
        
        // Set initial userBid based on first ride option price
        if (updatedRideOptions.length > 0 && !userBid) {
          setUserBid(updatedRideOptions[0].price || 0);
        }
      } else {
        toast({
          title: "Error",
          description: "Could not calculate route. Please try again.",
          duration: 3000
        });
        setIsSearchingRides(false);
      }
    }
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };
  
  const calculateBaseFare = (distance: number, vehicleType: string): number => {
    const baseRate = vehicleType === 'Bike' ? 20 : 35;
    return Math.round(baseRate * distance);
  };
  
  const confirmRide = async (paymentMethod: PaymentMethod) => {
    console.log('Confirming ride with params:', {
      userId: user?.id,
      pickupLocation,
      dropoffLocation,
      selectedRideOption,
      userBid,
      estimatedDistance,
      estimatedDuration
    });

    if (!user?.id || !pickupLocation || !dropoffLocation || !selectedRideOption || !userBid) {
      const missingParams = {
        userId: !user?.id,
        pickupLocation: !pickupLocation,
        dropoffLocation: !dropoffLocation,
        selectedRideOption: !selectedRideOption,
        userBid: !userBid
      };
      console.error('Missing required information:', missingParams);
      
      toast({
        title: "Error",
        description: "Missing required information to create ride request",
        duration: 3000
      });
      return;
    }

    if (!estimatedDistance || !estimatedDuration) {
      console.error('Missing estimations:', { estimatedDistance, estimatedDuration });
      
      toast({
        title: "Error",
        description: "Please wait for ride estimation to complete",
        duration: 3000
      });
      return;
    }

    // Start searching state
    setIsSearchingRides(true);

    try {
      console.log('Creating new ride request with:', {
        passengerId: user.id,
        pickupLocation,
        dropoffLocation,
        bidAmount: userBid,
        vehicleType: selectedRideOption.name,
        estimatedDistance,
        estimatedDuration,
        paymentMethod
      });

      // Create the ride request
      const { data: ride, error, unsubscribe } = await createNewRideRequest({
        passengerId: user.id,
        pickupLocation,
        dropoffLocation,
        bidAmount: userBid,
        vehicleType: selectedRideOption.name.toLowerCase(),
        estimatedDistance,
        estimatedDuration,
        paymentMethod
      });

      // Handle error from ride creation
      if (error) {
        console.error('Error from createNewRideRequest:', error);
        throw new Error(error);
      }

      // Check if ride was created properly
      if (!ride) {
        console.error('No ride returned from createNewRideRequest');
        throw new Error('Failed to create ride request');
      }

      console.log('Successfully created ride:', ride);
      
      // Set current ride in waiting state
      const newRide: Ride = {
        id: ride.id,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        rideOption: selectedRideOption,
        status: "searching",
        price: userBid,
        currency: "RS",
        distance: estimatedDistance,
        duration: estimatedDuration,
        paymentMethod: paymentMethod
      };
      
      console.log('Setting current ride to:', newRide);
      setCurrentRide(newRide);

      // Update UI state for driver acceptance
      setWaitingForDriverAcceptance(true);
      resetDriverAcceptanceTimer();

      // Start a timer to check for ride acceptance - store in a ref to access current state
      const currentRideId = ride.id;
      console.log(`Starting 60-second timer for ride ${currentRideId}`);
      
      const timer = setTimeout(async () => {
        // Get the latest ride status from the database
        const { data: currentRideData } = await supabase
          .from('rides')
          .select('status')
          .eq('id', currentRideId)
          .single();
        
        console.log(`Timer expired for ride ${currentRideId}. Current status:`, currentRideData?.status);
        
        // Only cancel if status is still "searching"
        if (currentRideData?.status === 'searching') {
          console.log(`No driver found after timeout. Cancelling ride ${currentRideId}`);
          
          // Cancel the ride if no driver accepts
          cancelRide(currentRideId, "No driver found");
          setCurrentRide(null);
          setWaitingForDriverAcceptance(false);
          
          toast({
            title: "No Driver Found",
            description: "Please try requesting again",
            duration: 3000
          });
        }
      }, 60000); // 1 minute timeout

      // Subscribe to ride status updates
      console.log(`Subscribing to updates for ride ${ride.id}`);
      const statusUnsubscribe = subscribeToRideUpdates(ride.id, (updatedRide) => {
        console.log('Received ride update:', updatedRide);
        
        if (updatedRide.status === "confirmed") {
          console.log('Ride confirmed by driver');
          clearTimeout(timer);
          setWaitingForDriverAcceptance(false);
          setCurrentRide({
            ...newRide,
            status: 'confirmed',
            driver: updatedRide.driver
          });
          
          toast({
            title: "Ride Confirmed",
            description: "A driver has accepted your ride request",
            duration: 3000
          });
        }
      });

      // Return the ride ID for the caller
      return ride.id;
    } catch (error: any) {
      console.error("Error confirming ride:", error);
      toast({
        title: "Error",
        description: error.message || "Could not create ride request",
        duration: 3000
      });
      return null;
    } finally {
      setIsSearchingRides(false);
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
  
  const cancelRide = (rideId?: string, reason?: string) => {
    const targetRideId = rideId || currentRide?.id;
    if (!targetRideId) return;
    
    updateRideStatus(targetRideId, 'cancelled', { cancellation_reason: reason })
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
  
  useEffect(() => {
    // When switching to driver mode, we need to reset passenger-specific state
    if (isDriverMode) {
      // Clear passenger-specific state
      setPickupLocation(null);
      setDropoffLocation(null);
      setSelectedRideOption(null);
      setUserBid(null);
      setPanelOpen(false);
      
      // If there's an active ride in passenger mode, don't clear it
      // This allows the driver to switch back and still see their ride
      if (currentRide && currentRide.status !== 'searching') {
        console.log('Keeping current ride while switching to driver mode:', currentRide);
      } else {
        setCurrentRide(null);
      }
      
      // Fetch pending ride requests for the driver
      if (user?.id) {
        console.log('Switching to driver mode, fetching ride requests');
        // Logic to fetch pending ride requests can be added here
        // or handled in the RideRequests component
      }
    } else {
      // When switching back to passenger mode, clear driver-specific state
      setPendingRideRequests([]);
    }
  }, [isDriverMode, user?.id]);
  
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
        setWalletBalance,
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
