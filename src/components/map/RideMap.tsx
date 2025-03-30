
import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { Clock } from 'lucide-react';

const RideMap: React.FC = () => {
  const { 
    currentRide, 
    rideTimer, 
    isRideTimerActive 
  } = useRide();

  // Format timer as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-[60vh] bg-gray-100">
      {/* Mock map - in a real app, this would be a proper map component */}
      <div className="w-full h-full bg-gray-200">
        {/* Car and route would be shown here */}
        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/-73.9857,40.7484,11,0/1200x900?access_token=pk.demo')] bg-cover bg-center opacity-70"></div>
        
        {/* Pickup and dropoff markers */}
        {currentRide && (
          <>
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center">
              <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
            
            <div className="absolute bottom-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-300/80 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </div>
            
            {/* Car icon */}
            <div className="absolute bottom-1/4 right-1/4 w-8 h-8">
              <div className="w-8 h-8 bg-[#FFD700] rounded-sm transform rotate-45"></div>
            </div>
            
            {/* Route line */}
            <div className="absolute top-1/4 left-1/2 w-1 h-[20vh] bg-[#FFD700] transform -translate-x-1/2 rotate-45"></div>
            <div className="absolute bottom-1/3 left-1/3 w-[20vw] h-1 bg-[#FFD700] transform -translate-y-1/2 rotate-45"></div>
          </>
        )}
        
        {/* Timer */}
        {isRideTimerActive && (
          <div className="absolute bottom-[15%] left-1/2 transform -translate-x-1/2 rounded-full bg-black text-white px-6 py-2 flex items-center gap-2">
            <Clock size={18} />
            <span className="text-lg font-medium">{formatTime(rideTimer)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideMap;
