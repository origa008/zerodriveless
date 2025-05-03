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
  calculateFare, 
  updateRideStatus,
  getRideById
} from '../utils/rideUtils';
import { supabase } from '@/integrations/supabase/client';

type RideContextType = {
  pickup: Location | null;
  dropoff: Location | null;
  selectedRide: RideOption | null;
  paymentMethod: PaymentMethod;
  currentRide: Ride | null;
  availableRides: RideOption[];
  isDriverMode: boolean;
  isPendingRide: boolean;
  estimatedPrice: number | null;
  walletBalance: number;
  pendingRideRequests: any[];
  setPickup: (location: Location | null) => void;
  setDropoff: (location: Location | null) => void;
  setSelectedRide: (ride: RideOption | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCurrentRide: (ride: Ride | null) => void;
  setAvailableRides: (rides: RideOption[]) => void;
  setDriverMode: (isDriver: boolean) => void;
  setIsPendingRide: (isPending: boolean) => void;
  calculateBaseFare: (distance: number, rideType?: string) => number;
  setEstimatedPrice: (price: number | null) => void;
  setWalletBalance: (balance: number) => void;
  setPendingRideRequests: (requests: any[]) => void;
  startRide: (rideId: string) => Promise<boolean>;
  completeRide: (rideId: string) => Promise<boolean>;
  cancelRide: (rideId: string, reason?: string) => Promise<boolean>;
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
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
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
        } else {
          // Fetch the ride if it's not the current one
          const { ride } = await getRideById(rideId);
          if (ride) {
            setCurrentRide(ride);
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
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error cancelling ride:", error);
      return false;
    }
  };

  return (
    <RideContext.Provider value={{
      pickup,
      setPickup,
      dropoff,
      setDropoff,
      selectedRide,
      setSelectedRide,
      paymentMethod,
      setPaymentMethod,
      currentRide,
      setCurrentRide,
      availableRides,
      setAvailableRides,
      isDriverMode,
      setDriverMode,
      isPendingRide,
      setIsPendingRide,
      estimatedPrice,
      setEstimatedPrice,
      calculateBaseFare,
      walletBalance,
      setWalletBalance,
      pendingRideRequests,
      startRide,
      completeRide,
      cancelRide,
      // Make sure setPendingRideRequests is properly typed
      setPendingRideRequests: (requests) => setPendingRideRequests(requests),
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
