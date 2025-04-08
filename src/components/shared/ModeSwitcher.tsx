
import React from 'react';
import { User, Car } from 'lucide-react';
import { useRide } from '@/lib/context/RideContext';
import { useNavigate } from 'react-router-dom';

interface ModeSwitcherProps {
  isDriverEligible?: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ isDriverEligible = false }) => {
  const navigate = useNavigate();
  const { isDriverMode, setDriverMode } = useRide();
  
  const handleToggle = (isDriver: boolean) => {
    if (isDriver) {
      if (isDriverEligible) {
        navigate('/driver-dashboard');
      } else {
        navigate('/official-driver');
      }
    } else {
      setDriverMode(false);
      navigate('/');
    }
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-full shadow-lg z-10">
      <div className="flex">
        <button
          className={`flex items-center px-4 py-2 rounded-l-full transition ${!isDriverMode ? 'bg-black text-white' : 'text-gray-600'}`}
          onClick={() => handleToggle(false)}
        >
          <User className="mr-2" size={18} />
          <span className="text-sm font-medium">Passenger</span>
        </button>
        <button
          className={`flex items-center px-4 py-2 rounded-r-full transition ${isDriverMode ? 'bg-black text-white' : 'text-gray-600'}`}
          onClick={() => handleToggle(true)}
        >
          <Car className="mr-2" size={18} />
          <span className="text-sm font-medium">Driver</span>
        </button>
      </div>
    </div>
  );
};

export default ModeSwitcher;
