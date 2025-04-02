
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ride, Location, RideOption, Driver, PaymentMethod, RideStatus } from '../types';
import { calculateDistance } from '../utils/mapsApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Default values
const defaultPickupLocation: Location = {
  name: "Current Location",
  address: "Using GPS",
  coordinates: [74.3587, 31.5204] // Default to Lahore
};

const defaultDropoffLocation: Location = {
  name: "",
  address: "",
  coordinates: [74.3587, 31.5204] // Default to Lahore
};

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
};

// Create context
const RideContext = createContext<RideContextType | undefined>(undefined);

// Provider component
export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
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
      // Create ride in Supabase
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .insert({
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
        })
        .select()
        .single();
      
      if (rideError) {
        throw rideError;
      }
      
      // Create ride object
      const newRide: Ride = {
        id: rideData.id,
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
      const interval = setInterval(async () => {
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
          .eq('id', rideData.id)
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
          navigate('/ride-progress');
        }
      }, 5000);
      
      // Clean up interval on unmount
      return () => clearInterval(interval);
      
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
      navigate('/ride-completed');
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
    navigate('/');
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
          passenger:passenger_id(id, name, avatar, phone),
          driver:driver_id(id, name, avatar, phone)
        `)
        .or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Transform the data to match the Ride type
      const transformedRides = data.map(ride => ({
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
        passenger: ride.passenger,
        driver: ride.driver,
      }));
      
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
            passenger:passenger_id(id, name, avatar, phone)
          `)
          .eq('status', 'searching')
          .is('driver_id', null);
        
        if (error) {
          throw error;
        }
        
        // Transform to Ride objects
        const availableRidesData = data.map(ride => ({
          id: ride.id,
          pickup: ride.pickup_location as unknown as Location,
          dropoff: ride.dropoff_location as unknown as Location,
          rideOption: ride.ride_option as unknown as RideOption,
          status: 'searching' as RideStatus,
          price: ride.price,
          currency: ride.currency,
          distance: ride.distance,
          duration: ride.duration,
          passenger: ride.passenger
        }));
        
        setAvailableRides(availableRidesData);
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
      }, fetchAvailableRides)
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
          passenger:passenger_id(id, name, avatar, phone)
        `)
        .eq('id', rideId)
        .single();
      
      if (rideError) {
        throw rideError;
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
        passenger: rideData.passenger
      };
      
      setCurrentRide(acceptedRide);
      setIsRideInProgress(true);
      navigate('/ride-progress');
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast({
        title: "Acceptance Failed",
        description: "Failed to accept ride. It may have already been accepted by another driver.",
        variant: "destructive"
      });
    }
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
    acceptRide
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
