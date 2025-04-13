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
  driverLocation: { latitude: number; longitude: number } | null;
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
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
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
    if (!pickupLocation?.latitude || !pickupLocation?.longitude || 
        !dropoffLocation?.latitude || !dropoffLocation?.longitude || 
        !window.google) {
      toast({
        title: "Error",
        description: "Please select both pickup and dropoff locations",
        duration: 3000
      });
      return;
    }
    
    setIsSearchingRides(true);
    
    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      const result = await directionsService.route({
        origin: {
          lat: pickupLocation.latitude,
          lng: pickupLocation.longitude
        },
        destination: {
          lat: dropoffLocation.latitude,
          lng: dropoffLocation.longitude
        },
        travelMode: window.google.maps.TravelMode.DRIVING
      });

      if (result.routes[0]) {
        const distance = result.routes[0].legs[0].distance.value / 1000; // Convert to km
        const duration = Math.ceil(result.routes[0].legs[0].duration.value / 60); // Convert to minutes
        
        setEstimatedDistance(distance);
        setEstimatedDuration(duration);
        
        // Get available ride options with real prices
        const options = [
          {
            id: 'bike',
            name: 'Bike',
            description: 'Affordable bike ride',
            image: '/assets/bike.png',
            basePrice: calculateBaseFare(distance, 'Bike'),
            estimatedTime: duration,
            pricePerKm: 20,
            pricePerMinute: 2
          },
          {
            id: 'auto',
            name: 'Auto',
            description: 'Comfortable auto ride',
            image: '/assets/auto.png',
            basePrice: calculateBaseFare(distance, 'Auto'),
            estimatedTime: duration,
            pricePerKm: 35,
            pricePerMinute: 3
          }
        ];
        
        setAvailableRideOptions(options);
        setSelectedRideOption(options[0]); // Default to bike
        setUserBid(options[0].basePrice); // Set initial bid to base price
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      toast({
        title: "Error",
        description: "Failed to calculate route. Please try again.",
        duration: 3000
      });
    } finally {
      setIsSearchingRides(false);
      setPanelOpen(true);
    }
  };
  
  const calculateBaseFare = (distance: number, vehicleType: string): number => {
    const baseRate = vehicleType === 'Bike' ? 20 : 35;
    return Math.round(baseRate * distance);
  };
  
  const confirmRide = async (paymentMethod: PaymentMethod) => {
    if (!user?.id || !pickupLocation || !dropoffLocation || !selectedRideOption || !userBid) {
      toast({
        title: "Error",
        description: "Missing required information to create ride request",
        duration: 3000
      });
      return;
    }

    if (!estimatedDistance || !estimatedDuration) {
      toast({
        title: "Error",
        description: "Please wait for ride estimation to complete",
        duration: 3000
      });
      return;
    }

    setIsSearchingRides(true);

    try {
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

      if (error) throw new Error(error);

      if (ride) {
        // Set current ride in waiting state
        setCurrentRide({
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
        });

        setWaitingForDriverAcceptance(true);
        resetDriverAcceptanceTimer();

        // Start a timer to check for ride acceptance
        const timer = setTimeout(() => {
          if (currentRide?.status === "searching") {
            // Cancel the ride if no driver accepts
            cancelRide(ride.id, "No driver found");
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
        const statusUnsubscribe = subscribeToRideUpdates(ride.id, (updatedRide) => {
          if (updatedRide.status === "confirmed") {
            clearTimeout(timer);
            setWaitingForDriverAcceptance(false);
            setCurrentRide(updatedRide);
            toast({
              title: "Ride Confirmed",
              description: "A driver has accepted your ride request",
              duration: 3000
            });
          }
        });

        // Clean up on component unmount
        return () => {
          clearTimeout(timer);
          unsubscribe();
          if (statusUnsubscribe) statusUnsubscribe();
        };
      }
    } catch (error: any) {
      console.error("Error confirming ride:", error);
      toast({
        title: "Error",
        description: error.message || "Could not create ride request",
        duration: 3000
      });
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
  
  // Watch driver location when in driver mode
  useEffect(() => {
    if (!isDriverMode || !user?.id) return;

    let watchId: number | null = null;

    const setupLocationWatch = () => {
      if (!navigator.geolocation) return;

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setDriverLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    setupLocationWatch();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isDriverMode, user?.id]);

  // Start ride timer when ride is in progress
  useEffect(() => {
    if (!currentRide || currentRide.status !== 'in_progress') {
      setRideTimer(0);
      return;
    }

    const interval = setInterval(() => {
      setRideTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRide]);

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
        setWalletBalance(data.balance || 0);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };

    fetchWalletBalance();
  }, [user?.id]);
  
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
        transactions,
        driverLocation
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
