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
  rideHistory: Ride[];
  addToHistory: (ride: Ride) => void;
  fareMultiplier: number;
  updateFareMultiplier: () => void;
  userBid: number | null;
  setUserBid: (bid: number | null) => void;
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
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [fareMultiplier, setFareMultiplier] = useState<number>(1);
  const [userBid, setUserBid] = useState<number | null>(null);

  const availableRideOptions = availableRideOptionsWithPricing;

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
          
          // Apply fare multiplier to base price (9 RS per km)
          const basePrice = Math.round(result.distance * 9 * fareMultiplier);
          
          const updatedOptions = defaultRideOptions.map(option => {
            let price = basePrice;
            
            // Apply vehicle-specific modifiers
            if (option.id === '1') { // Bike is cheaper
              price = Math.round(basePrice * 0.8);
            } else if (option.id === '2') { // Auto is more expensive
              price = Math.round(basePrice * 1.2);
            }
            
            return {
              ...option,
              price,
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
    
    // Apply the base price calculation
    if (estimatedDistance) {
      const basePrice = Math.round(estimatedDistance * 9 * fareMultiplier);
      setUserBid(basePrice); // Set initial bid to base price
    }
    
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
      duration: estimatedDuration || 15
    };

    setCurrentRide(newRide);
    setPanelOpen(false);
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
    setUserBid
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
