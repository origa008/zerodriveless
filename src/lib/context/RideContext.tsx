
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ride, Location, RideOption, Driver } from '../types';
import { calculateDistance } from '../utils/mapsApi';

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
};

const defaultRideOptions: RideOption[] = [
  {
    id: '1',
    name: 'Bike',
    image: '/lovable-uploads/e30d2010-d04d-4e54-b564-033da8613f0b.png',
    price: 120,
    currency: 'RS',
    duration: 3,
    capacity: 4
  },
  {
    id: '2',
    name: 'Auto',
    image: '/lovable-uploads/92f50cbc-8a9a-4634-b7fa-d3b0bbf59202.png',
    price: 210,
    currency: 'RS',
    duration: 3,
    capacity: 4
  }
];

const defaultDriver: Driver = {
  id: '1',
  name: 'John Smith',
  rating: 4.8,
  licensePlate: 'ABC-123',
  avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // For demo purposes, we'll use a static list of ride options
  const availableRideOptions = availableRideOptionsWithPricing;

  // Calculate distance and duration when both pickup and dropoff locations have coordinates
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
          
          // Update ride options with calculated prices based on distance
          const updatedOptions = defaultRideOptions.map(option => ({
            ...option,
            price: Math.round(option.price * (result.distance || 1)),
            duration: result.duration
          }));
          
          setAvailableRideOptionsWithPricing(updatedOptions);
        }
      }
    };

    calculateDistanceAndDuration();
  }, [pickupLocation?.coordinates, dropoffLocation?.coordinates]);

  React.useEffect(() => {
    if (isRideTimerActive && currentRide?.status === 'in_progress') {
      const interval = setInterval(() => {
        setRideTimer((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Auto complete ride after 2 minutes (120 seconds)
    if (rideTimer >= 120 && currentRide?.status === 'in_progress') {
      completeRide();
    }
  }, [isRideTimerActive, rideTimer, currentRide?.status]);

  const findRides = async () => {
    if (!pickupLocation || !dropoffLocation) {
      console.error('Pickup and dropoff locations are required');
      return;
    }
    
    setIsSearchingRides(true);
    
    // Simulate searching for rides
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

    const newRide: Ride = {
      id: Math.random().toString(36).substr(2, 9),
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      rideOption: selectedRideOption,
      driver: defaultDriver,
      status: 'confirmed',
      price: selectedRideOption.price,
      currency: selectedRideOption.currency,
      distance: estimatedDistance || 4.8,
      duration: estimatedDuration || 15
    };

    setCurrentRide(newRide);
    setPanelOpen(false);
  };

  const startRide = () => {
    if (!currentRide) return;
    
    setCurrentRide({
      ...currentRide,
      status: 'in_progress',
      startTime: new Date()
    });
    
    setRideTimer(0);
    setIsRideTimerActive(true);
  };

  const completeRide = () => {
    if (!currentRide) return;
    
    setCurrentRide({
      ...currentRide,
      status: 'completed',
      endTime: new Date()
    });
    
    setIsRideTimerActive(false);
  };

  const cancelRide = () => {
    if (!currentRide) return;
    
    setCurrentRide({
      ...currentRide,
      status: 'cancelled'
    });
    
    setIsRideTimerActive(false);
  };

  return (
    <RideContext.Provider value={{
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
      estimatedDuration
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
