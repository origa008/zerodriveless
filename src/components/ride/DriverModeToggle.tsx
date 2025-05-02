import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { useNavigate } from 'react-router-dom';
import { Car, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DriverModeToggleProps {
  className?: string;
}

const DriverModeToggle: React.FC<DriverModeToggleProps> = ({ className }) => {
  const { isDriverMode, setDriverMode } = useRide();
  const navigate = useNavigate();

  const handleToggle = () => {
    const newMode = !isDriverMode;
    setDriverMode(newMode);
    
    // Navigate to appropriate screen based on the mode
    if (newMode) {
      // Navigate to driver screen
      navigate('/ride-requests');
    } else {
      // Navigate to passenger home screen
      navigate('/ride-requests'); // Changed to navigate to RideRequests page
    }
  };

  return (
    <div className={`flex items-center gap-2 bg-blue-500 text-white rounded-full px-4 py-2 ${className}`}>
      <User className={`h-4.5 w-4.5 ${!isDriverMode ? 'text-white' : 'text-gray-300'}`} />
      <div className="flex items-center gap-2">
        <Switch
          checked={isDriverMode}
          onCheckedChange={handleToggle}
          id="driver-mode"
          className="data-[state=checked]:bg-white/50 data-[state=unchecked]:bg-white/20"
        />
        <Label htmlFor="driver-mode" className="text-sm cursor-pointer">
          {isDriverMode ? 'Driver Mode' : 'Passenger Mode'}
        </Label>
      </div>
      <Car className={`h-4.5 w-4.5 ${isDriverMode ? 'text-white' : 'text-gray-300'}`} />
    </div>
  );
};

export default DriverModeToggle;