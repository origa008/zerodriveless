
import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { User, Phone, MapPin, Clock, Navigation } from 'lucide-react';

const RideDetails: React.FC = () => {
  const { currentRide, isDriverMode, rideTimer } = useRide();
  const { user } = useAuth();

  if (!currentRide) return null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {currentRide.status === 'in_progress' ? 'Ride in Progress' : 'Ride Details'}
          </h3>
          {currentRide.status === 'in_progress' && (
            <div className="text-2xl font-bold">{formatTime(rideTimer)}</div>
          )}
        </div>
        
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-full mr-3 overflow-hidden">
            {isDriverMode ? (
              <img 
                src={user?.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'} 
                alt="Passenger" 
                className="h-full w-full object-cover" 
              />
            ) : (
              <img 
                src={currentRide.driver?.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'} 
                alt={currentRide.driver?.name || 'Driver'} 
                className="h-full w-full object-cover" 
              />
            )}
          </div>
          <div>
            <p className="font-medium">
              {isDriverMode ? user?.name || 'Passenger' : currentRide.driver?.name || 'Driver'}
            </p>
            {!isDriverMode && currentRide.driver?.licensePlate && (
              <p className="text-gray-500 text-sm">{currentRide.driver.licensePlate}</p>
            )}
            {isDriverMode && (
              <div className="flex mt-1">
                <button className="text-sm bg-gray-100 px-2 py-1 rounded-full mr-2 flex items-center">
                  <Phone size={12} className="mr-1" />
                  Call
                </button>
                <button className="text-sm bg-gray-100 px-2 py-1 rounded-full flex items-center">
                  <Navigation size={12} className="mr-1" />
                  Navigate
                </button>
              </div>
            )}
          </div>
          {!isDriverMode && currentRide.driver?.rating && (
            <div className="ml-auto">
              <div className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                <User size={16} className="mr-1" />
                <span>{currentRide.driver.rating}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="flex">
            <div className="min-w-[24px] flex justify-center mr-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1"></div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pickup</p>
              <p className="font-medium">{currentRide.pickup.name}</p>
            </div>
          </div>
          <div className="flex">
            <div className="min-w-[24px] flex justify-center mr-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dropoff</p>
              <p className="font-medium">{currentRide.dropoff.name}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="flex justify-between mb-3">
            <span className="text-gray-600">Fare:</span>
            <span className="font-bold">{currentRide.price} {currentRide.currency}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-gray-600">Distance:</span>
            <span>{currentRide.distance} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Est. Duration:</span>
            <span>{currentRide.duration} min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideDetails;
