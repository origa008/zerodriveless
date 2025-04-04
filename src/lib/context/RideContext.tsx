
import React, { createContext, useContext, useState } from 'react';
import { RideOption, Location, Driver, PaymentMethod } from '../types';

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
  setPendingRideRequests: (requests: any[]) => void;
};

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [selectedOption, setSelectedOption] = useState<RideOption | null>(null);
  const [isDriverMode, setDriverMode] = useState<boolean>(false);
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);

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
