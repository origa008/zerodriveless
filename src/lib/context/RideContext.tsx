import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ride, Location, RideOption, Driver, PaymentMethod, RideStatus, Passenger } from '../types';
import { calculateDistance } from '../utils/mapsApi';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Default values
const defaultPickupLocation: Location = {
  name: "Current Location",
  address: "Using GPS",
  coordinates: [74.3587, 31.5204], // Default to Lahore
  placeId: ""
};

const defaultDropoffLocation: Location = {
  name: "",
  address: "",
  coordinates: [74.3587, 31.5204], // Default to Lahore
  placeId: ""
};

// Available ride options
const rideOptions: RideOption[] = [
  {
    id: "bike",
    name: "Bike",
    image: "/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png",
    price: 150,
    currency: "RS",
    duration: 15,
    capacity: 1
  },
  {
    id: "auto",
    name: "Auto",
    image: "/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png",
    price: 250,
    currency: "RS",
    duration: 20,
    capacity: 3
  }
];

// Context type
type RideContextType = {
  pickupLocation: Location;
  dropoffLocation: Location;
  selectedRideOption: RideOption | null;
  estimatedDistance: number;
  estimatedDuration: number;
  setPickupLocation: (location: Location) => void;
  setDropoffLocation: (location: Location) => void;
  setSelectedRideOption: (option: RideOption | null) => void;
  calculateRide: () => Promise<boolean>;
  requestRide: () => Promise<void>;
  isDriverMode: boolean;
  setDriverMode: (isDriver: boolean) => void;
  isSearchingRide: boolean;
  cancelRideSearch: () => void;
  currentRide: Ride | null;
  isRideInProgress: boolean;
  completeRide: () => Promise<void>;
  skipFeedback: () => void;
  rideHistory: Ride[];
  walletBalance: number;
  updateWalletBalance: (amount: number) => Promise<void>;
  fetchWalletBalance: () => Promise<void>;
  fetchRideHistory: () => Promise<void>;
  availableRides: Ride[];
  acceptRide: (rideId: string) => Promise<void>;
  pendingRideRequests: Ride[];
  calculateBaseFare: (distance: number, vehicleType: string) => number;
  acceptRideRequest: (rideId: string) => void;
  setCurrentRide: (ride: Ride) => void;
  startRide: () => Promise<void>;
  cancelRide: () => void;
  rideTimer: number;
  isRideTimerActive: boolean;
  availableRideOptions: RideOption[];
  findRides: () => void;
  confirmRide: (paymentMethod: string) => void;
  isSearchingRides: boolean;
  userBid: number | null;
  setUserBid: (bid: number) => void;
  isWaitingForDriverAcceptance: boolean;
  setWaitingForDriverAcceptance: (waiting: boolean) => void;
  driverAcceptanceTimer: number;
  resetDriverAcceptanceTimer: () => void;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  navigateToPage: (path: string) => void;
};

// Create context
const RideContext = createContext<RideContextType | undefined>(undefined);

// Provider component
export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  // State
  const [pickupLocation, setPickupLocation] = useState<Location>(defaultPickupLocation);
  const [dropoffLocation, setDropoffLocation] = useState<Location>(defaultDropoffLocation);
  const [selectedRideOption, setSelectedRideOption] = useState<RideOption | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number>(0);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [isDriverMode, setDriverMode] = useState<boolean>(false);
  const [isSearchingRide, setIsSearchingRide] = useState<boolean>(false);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isRideInProgress, setIsRideInProgress] = useState<boolean>(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [rideTimer, setRideTimer] = useState<number>(0);
  const [isRideTimerActive, setIsRideTimerActive] = useState<boolean>(false);
  const [availableRideOptions, setAvailableRideOptions] = useState<RideOption[]>(rideOptions);
  const [isSearchingRides, setIsSearchingRides] = useState<boolean>(false);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [isWaitingForDriverAcceptance, setWaitingForDriverAcceptance] = useState<boolean>(false);
  const [driverAcceptanceTimer, setDriverAcceptanceTimer] = useState<number>(60);
  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);
  const [pendingRideRequests, setPendingRideRequests] = useState<Ride[]>([]);

  // This function allows components to navigate programmatically
  const navigateToPage = (path: string) => {
    // Using window.location for navigation
    window.location.href = path;
  };

  // Calculate distance and duration between pickup and dropoff locations
  const calculateRide = async (): Promise<boolean> => {
    if (
      !pickupLocation || 
      !pickupLocation.coordinates || 
      !dropoffLocation || 
      !dropoffLocation.coordinates
    ) {
      return false;
    }

    try {
      const result = await calculateDistance(
        pickupLocation.coordinates,
        dropoffLocation.coordinates
      );

      if (result) {
        setEstimatedDistance(result.distance);
        setEstimatedDuration(result.duration);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error calculating ride:", error);
      return false;
    }
  };

  // Calculate base fare based on distance and vehicle type
  const calculateBaseFare = (distance: number, vehicleType: string): number => {
    const baseRate = vehicleType.toLowerCase() === 'bike' ? 15 : 30;
    const perKmRate = vehicleType.toLowerCase() === 'bike' ? 8 : 15;
    return Math.round(baseRate + (distance * perKmRate));
  };

  // Request a ride
  const requestRide = async () => {
    if (!selectedRideOption || !user) {
      toast({
        title: "Cannot request ride",
        description: "Please select a ride option or log in first.",
        variant: "destructive"
      });
      return;
    }

    setIsSearchingRide(true);

    try {
      // Insert a ride object into the rides table
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .insert([{  // Wrap the object in an array for Supabase
          passenger_id: user.id,
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation,
          ride_option: selectedRideOption,
          price: selectedRideOption.price,
          currency: 'RS',
          distance: estimatedDistance,
          duration: estimatedDuration,
          status: 'searching',
          payment_method: 'cash'
        }])
        .select();
      
      if (rideError) {
        throw rideError;
      }
      
      if (!rideData || rideData.length === 0) {
        throw new Error("No ride data returned after insert");
      }
      
      // Create ride object
      const newRide: Ride = {
        id: rideData[0].id,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        rideOption: selectedRideOption,
        status: 'searching',
        price: selectedRideOption.price,
        currency: 'RS',
        distance: estimatedDistance,
        duration: estimatedDuration,
        paymentMethod: 'cash'
      };
      
      setCurrentRide(newRide);
      
      // Start polling for ride status changes
      let interval: number;
      
      const pollRideStatus = () => {
        interval = window.setInterval(async () => {
          const { data, error } = await supabase
            .from('rides')
            .select(`
              id,
              status,
              driver_id,
              pickup_location,
              dropoff_location,
              ride_option,
              price,
              currency,
              distance,
              duration,
              start_time,
              end_time,
              payment_method
            `)
            .eq('id', rideData[0].id)
            .single();
          
          if (error) {
            console.error('Error polling ride status:', error);
            return;
          }
          
          if (data.status === 'confirmed') {
            setIsSearchingRide(false);
            clearInterval(interval);
            
            // Get driver details
            const { data: driverData, error: driverError } = await supabase
              .from('profiles')
              .select('id, name, avatar, phone')
              .eq('id', data.driver_id)
              .single();
            
            if (driverError) {
              console.error('Error fetching driver details:', driverError);
            }
            
            // Update current ride with driver details
            const updatedRide: Ride = {
              id: data.id,
              pickup: data.pickup_location as unknown as Location,
              dropoff: data.dropoff_location as unknown as Location,
              rideOption: data.ride_option as unknown as RideOption,
              driver: driverData ? {
                id: driverData.id,
                name: driverData.name,
                avatar: driverData.avatar,
                phone: driverData.phone
              } : undefined,
              status: data.status as RideStatus,
              price: data.price,
              currency: data.currency,
              distance: data.distance,
              duration: data.duration,
              startTime: data.start_time ? new Date(data.start_time) : undefined,
              endTime: data.end_time ? new Date(data.end_time) : undefined,
              paymentMethod: data.payment_method as PaymentMethod
            };
            
            setCurrentRide(updatedRide);
            setIsRideInProgress(true);
            navigateToPage('/ride-progress');
          }
        }, 5000);
      };
      
      // Start polling
      pollRideStatus();
      
      // Cleanup function will be managed by component unmounts through useEffect
      return () => {
        if (interval) clearInterval(interval);
      };
    } catch (error) {
      console.error('Error requesting ride:', error);
      setIsSearchingRide(false);
      toast({
        title: "Request Failed",
        description: "Failed to request ride. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Cancel a ride
  const cancelRideSearch = async () => {
    if (!currentRide) return;
    
    try {
      // Update ride status to cancelled
      await supabase
        .from('rides')
        .update({
          status: 'cancelled'
        })
        .eq('id', currentRide.id);
      
      setIsSearchingRide(false);
      setCurrentRide(null);
      
      toast({
        title: "Ride Cancelled",
        description: "Your ride request has been cancelled.",
        duration: 3000
      });
    } catch (error) {
      console.error('Error cancelling ride:', error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel ride. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Complete a ride
  const completeRide = async () => {
    if (!currentRide) return;
    
    try {
      // Update ride status to completed
      await supabase
        .from('rides')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', currentRide.id);
      
      // If passenger paid with wallet, create transaction
      if (currentRide.paymentMethod === 'wallet' && user) {
        // Create transaction for passenger (payment)
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: currentRide.price,
            type: 'ride_payment',
            status: 'completed',
            description: `Ride payment to ${currentRide.driver?.name || 'driver'}`,
            ride_id: currentRide.id,
            payment_method: 'wallet'
          });
        
        // Create transaction for driver (earning)
        if (currentRide.driver) {
          await supabase
            .from('transactions')
            .insert({
              user_id: currentRide.driver.id,
              amount: currentRide.price,
              type: 'ride_earning',
              status: 'completed',
              description: `Ride earnings from ${user.name}`,
              ride_id: currentRide.id,
              payment_method: 'wallet'
            });
        }
      }
      
      setIsRideInProgress(false);
      navigateToPage('/ride-completed');
    } catch (error) {
      console.error('Error completing ride:', error);
      toast({
        title: "Completion Failed",
        description: "Failed to complete ride. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Skip feedback
  const skipFeedback = () => {
    setCurrentRide(null);
    navigateToPage('/');
  };

  // Fetch ride history for the user
  const fetchRideHistory = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          pickup_location,
          dropoff_location,
          ride_option,
          status,
          price,
          currency,
          distance,
          duration,
          start_time,
          end_time,
          payment_method,
          passenger_id,
          driver_id
        `)
        .or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Transform the data to match the Ride type
      const transformedRides: Ride[] = data.map(ride => {
        // Create basic ride object with safe defaults
        const transformedRide: Ride = {
          id: ride.id,
          pickup: ride.pickup_location as unknown as Location,
          dropoff: ride.dropoff_location as unknown as Location,
          rideOption: ride.ride_option as unknown as RideOption,
          status: ride.status as RideStatus,
          price: ride.price,
          currency: ride.currency,
          distance: ride.distance,
          duration: ride.duration,
          startTime: ride.start_time ? new Date(ride.start_time) : undefined,
          endTime: ride.end_time ? new Date(ride.end_time) : undefined,
          paymentMethod: ride.payment_method as PaymentMethod,
          // Add default passenger and driver objects to prevent errors
          passenger: {
            id: ride.passenger_id || '',
            name: 'Unknown Passenger'
          },
          driver: ride.driver_id ? {
            id: ride.driver_id,
            name: 'Unknown Driver'
          } : undefined
        };
        
        return transformedRide;
      });
      
      setRideHistory(transformedRides);
    } catch (error) {
      console.error('Error fetching ride history:', error);
    }
  };

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      setWalletBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    }
  };

  // Update wallet balance
  const updateWalletBalance = async (amount: number) => {
    if (!user?.id) return;
    
    try {
      // Use Supabase RPC to update balance server-side
      if (amount > 0) {
        await supabase.rpc('add_to_wallet', {
          user_id: user.id,
          amount: amount
        });
      } else {
        await supabase.rpc('deduct_from_wallet', {
          user_id: user.id,
          amount: Math.abs(amount)
        });
      }
      
      // Refresh balance
      await fetchWalletBalance();
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to update wallet balance.",
        variant: "destructive"
      });
    }
  };

  // Fetch available rides (for drivers)
  useEffect(() => {
    if (!isDriverMode || !user?.id || !user.isVerifiedDriver) return;
    
    const fetchAvailableRides = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select(`
            id,
            pickup_location,
            dropoff_location,
            ride_option,
            status,
            price,
            currency,
            distance,
            duration,
            passenger_id
          `)
          .eq('status', 'searching')
          .is('driver_id', null);
        
        if (error) {
          throw error;
        }
        
        // Transform to Ride objects with proper typing
        const availableRidesData: Ride[] = data.map(ride => {
          const rideData: Ride = {
            id: ride.id,
            pickup: ride.pickup_location as unknown as Location,
            dropoff: ride.dropoff_location as unknown as Location,
            rideOption: ride.ride_option as unknown as RideOption,
            status: 'searching',
            price: ride.price,
            currency: ride.currency,
            distance: ride.distance,
            duration: ride.duration,
            passenger: {
              id: ride.passenger_id || '',
              name: 'Passenger' // Default name
            }
          };
          return rideData;
        });
        
        setAvailableRides(availableRidesData);
        setPendingRideRequests(availableRidesData);
      } catch (error) {
        console.error('Error fetching available rides:', error);
      }
    };
    
    // Initial fetch
    fetchAvailableRides();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('rides-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides'
      }, () => {
        fetchAvailableRides();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isDriverMode, user?.id, user?.isVerifiedDriver]);

  // Accept a ride (for drivers)
  const acceptRide = async (rideId: string) => {
    if (!user?.id || !user.isVerifiedDriver) {
      toast({
        title: "Cannot Accept Ride",
        description: "You must be a verified driver to accept rides.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Update ride with driver ID and change status
      const { error } = await supabase
        .from('rides')
        .update({
          driver_id: user.id,
          status: 'confirmed',
          start_time: new Date().toISOString()
        })
        .eq('id', rideId)
        .eq('status', 'searching'); // Ensure ride is still searching
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Ride Accepted",
        description: "You have accepted the ride. Navigate to pickup location.",
        duration: 5000
      });
      
      // Fetch updated ride details
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select(`
          id,
          pickup_location,
          dropoff_location,
          ride_option,
          status,
          price,
          currency,
          distance,
          duration,
          start_time,
          payment_method,
          passenger_id
        `)
        .eq('id', rideId)
        .single();
      
      if (rideError) {
        throw rideError;
      }
      
      // Fetch passenger details
      const { data: passengerData, error: passengerError } = await supabase
        .from('profiles')
        .select('id, name, avatar, phone')
        .eq('id', rideData.passenger_id)
        .single();
        
      if (passengerError) {
        console.error('Error fetching passenger details:', passengerError);
      }
      
      // Set current ride
      const acceptedRide: Ride = {
        id: rideData.id,
        pickup: rideData.pickup_location as unknown as Location,
        dropoff: rideData.dropoff_location as unknown as Location,
        rideOption: rideData.ride_option as unknown as RideOption,
        status: rideData.status as RideStatus,
        price: rideData.price,
        currency: rideData.currency,
        distance: rideData.distance,
        duration: rideData.duration,
        startTime: rideData.start_time ? new Date(rideData.start_time) : undefined,
        paymentMethod: rideData.payment_method as PaymentMethod,
        passenger: passengerData ? {
          id: passengerData.id,
          name: passengerData.name,
          avatar: passengerData.avatar,
          phone: passengerData.phone
        } : {
          id: rideData.passenger_id,
          name: 'Passenger'
        }
      };
      
      setCurrentRide(acceptedRide);
      setIsRideInProgress(true);
      navigateToPage('/ride-progress');
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast({
        title: "Acceptance Failed",
        description: "Failed to accept ride. It may have already been accepted by another driver.",
        variant: "destructive"
      });
    }
  };

  // Additional functions needed by components
  const acceptRideRequest = (rideId: string) => {
    acceptRide(rideId);
  };

  // Start a ride
  const startRide = () => {
    if (!currentRide) return Promise.resolve();
    setIsRideTimerActive(true);
    
    // Start ride timer
    const timerInterval = setInterval(() => {
      setRideTimer(prev => prev + 1);
    }, 1000);
    
    // Return Promise.resolve() directly
    return Promise.resolve();
  };

  const cancelRide = () => {
    cancelRideSearch();
  };

  const findRides = () => {
    setIsSearchingRides(true);
    calculateRide().then(success => {
      if (success) {
        setPanelOpen(true);
        setIsSearchingRides(false);
      } else {
        setIsSearchingRides(false);
        toast({
          title: "Error",
          description: "Could not calculate ride. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const confirmRide = (paymentMethod: string) => {
    if (!selectedRideOption || !userBid) return;
    
    // Create a modified ride option with the user's bid as the price
    const modifiedRideOption: RideOption = {
      ...selectedRideOption,
      price: userBid
    };
    
    setSelectedRideOption(modifiedRideOption);
    requestRide();
  };

  const resetDriverAcceptanceTimer = () => {
    setDriverAcceptanceTimer(60);
    const interval = setInterval(() => {
      setDriverAcceptanceTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setWaitingForDriverAcceptance(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Return a cleanup function
    return () => clearInterval(interval);
  };

  // Effect to load wallet balance and ride history on mount
  useEffect(() => {
    if (user?.id) {
      fetchWalletBalance();
      fetchRideHistory();
    }
  }, [user?.id]);

  // Context value
  const value: RideContextType = {
    pickupLocation,
    dropoffLocation,
    selectedRideOption,
    estimatedDistance,
    estimatedDuration,
    setPickupLocation,
    setDropoffLocation,
    setSelectedRideOption,
    calculateRide,
    requestRide,
    isDriverMode,
    setDriverMode,
    isSearchingRide,
    cancelRideSearch,
    currentRide,
    isRideInProgress,
    completeRide,
    skipFeedback,
    rideHistory,
    walletBalance,
    updateWalletBalance,
    fetchWalletBalance,
    fetchRideHistory,
    availableRides,
    acceptRide,
    pendingRideRequests,
    calculateBaseFare,
    acceptRideRequest,
    setCurrentRide,
    startRide,
    cancelRide,
    rideTimer,
    isRideTimerActive,
    availableRideOptions,
    findRides,
    confirmRide,
    isSearchingRides,
    userBid,
    setUserBid,
    isWaitingForDriverAcceptance,
    setWaitingForDriverAcceptance,
    driverAcceptanceTimer,
    resetDriverAcceptanceTimer,
    isPanelOpen,
    setPanelOpen,
    navigateToPage
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
};

// Hook to use ride context
export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error("useRide must be used within a RideProvider");
  }
  return context;
};
