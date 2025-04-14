import React, { useState } from 'react';
import { useRide } from '@/lib/context/RideContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Car, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ModeSwitcherProps {
  isDriverEligible?: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ isDriverEligible = false }) => {
  const { isDriverMode, setDriverMode } = useRide();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleModeSwitch = () => {
    // If not eligible, don't allow switch
    if (!isDriverEligible && !isDriverMode) {
      return;
    }
    
    const newMode = !isDriverMode;
    console.log(`Switching mode from ${isDriverMode ? 'driver' : 'passenger'} to ${newMode ? 'driver' : 'passenger'}`);
    setDriverMode(newMode);
    
    // Navigate to appropriate page based on mode
    if (newMode) {
      navigate('/ride-requests');
    } else {
      navigate('/');
    }
  };

  if (!isDriverEligible && !isDriverMode) {
    return (
      <div className="absolute top-4 right-4 z-20">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full bg-white flex items-center gap-1 opacity-70"
                disabled
              >
                <Car className="h-4 w-4 text-gray-400" />
                <span>Driver Mode</span>
                <AlertCircle className="h-4 w-4 text-amber-500 ml-1" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="max-w-xs text-sm">
                You need to register as a driver to access driver mode. Visit your profile settings to get started.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-20">
      <Button
        variant="outline"
        className={`rounded-full flex items-center gap-1 ${isDriverMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white'}`}
        onClick={handleModeSwitch}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Car className={`h-4 w-4 ${isDriverMode ? 'text-white' : 'text-blue-500'}`} />
        <span>{isDriverMode ? 'Switch to Passenger' : 'Switch to Driver'}</span>
      </Button>
    </div>
  );
};

export default ModeSwitcher;
