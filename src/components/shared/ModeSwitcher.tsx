
import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface ModeSwitcherProps {
  isDriverEligible?: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ isDriverEligible = false }) => {
  const { isDriverMode, setDriverMode } = useRide();
  const navigate = useNavigate();
  const location = useLocation();

  const handleModeSwitch = () => {
    const newMode = !isDriverMode;
    setDriverMode(newMode);
    
    // Navigate to appropriate page based on mode
    if (newMode) {
      navigate('/ride-requests');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20">
      <Button
        variant="outline"
        className={`rounded-full ${isDriverMode ? 'bg-zerodrive-purple text-white' : 'bg-white'}`}
        onClick={handleModeSwitch}
      >
        {isDriverMode ? 'Switch to Passenger' : 'Switch to Driver'}
      </Button>
    </div>
  );
};

export default ModeSwitcher;
