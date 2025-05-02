import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface ModeSwitcherProps {
  isDriverEligible?: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ isDriverEligible = false }) => {
  const { isDriverMode, setDriverMode } = useRide();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleModeSwitch = async () => {
    const newMode = !isDriverMode;
    
    if (newMode && !isDriverEligible) {
      // User wants to switch to driver mode but isn't eligible
      toast({
        title: 'Driver Registration Required',
        description: 'Please register as a driver to access ride requests.',
        variant: 'default'
      });
      
      // Navigate to driver registration page
      navigate('/register-driver');
      return;
    }

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
        <div className="flex items-center gap-2">
          <Switch
            checked={isDriverMode}
            onCheckedChange={handleModeSwitch}
            className="data-[state=checked]:bg-violet-600"
          />
          <span className="text-sm font-medium text-gray-600">
            Driver Mode
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
        <Switch
          checked={isDriverMode}
          onCheckedChange={handleModeSwitch}
          className="data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-gray-300"
        />
        <span className="text-sm font-medium">
          {isDriverMode ? 'Driver Mode' : 'Passenger Mode'}
        </span>
      </div>
    </div>
  );
};

export default ModeSwitcher;
