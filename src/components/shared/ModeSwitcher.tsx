
import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { Button } from '@/components/ui/button';

const ModeSwitcher: React.FC = () => {
  const { isDriverMode, setDriverMode } = useRide();

  return (
    <div className="absolute top-4 right-4 z-20">
      <Button
        variant="outline"
        className={`rounded-full ${isDriverMode ? 'bg-zerodrive-purple text-white' : 'bg-white'}`}
        onClick={() => setDriverMode(!isDriverMode)}
      >
        {isDriverMode ? 'Switch to Passenger' : 'Switch to Driver'}
      </Button>
    </div>
  );
};

export default ModeSwitcher;
