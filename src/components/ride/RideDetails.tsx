import React from 'react';
import { useRide } from '@/lib/context/RideContext';
import { MapPin, MessageCircle } from 'lucide-react';
const RideDetails: React.FC = () => {
  const {
    currentRide
  } = useRide();
  if (!currentRide) return null;
  return <div className="rounded-t-3xl shadow-lg p-6 my-0 py-0 bg-white">
      <div className="grid grid-cols-3 border-b border-gray-200 py-4">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Distance</p>
          <p className="text-2xl font-medium">{currentRide.distance} km</p>
        </div>
        <div className="text-center border-x border-gray-200">
          <p className="text-gray-500 text-lg">Price</p>
          <p className="text-2xl font-medium">{currentRide.price}{currentRide.currency}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-lg">Arrival</p>
          <p className="text-2xl font-medium">in {currentRide.duration} min</p>
        </div>
      </div>

      <div className="flex items-center mt-6 mb-10">
        <div className="h-16 w-16 rounded-full overflow-hidden mr-4">
          <img src={currentRide.driver?.avatar} alt={currentRide.driver?.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-medium">{currentRide.driver?.name}</h3>
          <div className="flex items-center">
            <p className="text-lg">{currentRide.driver?.licensePlate}</p>
            <div className="ml-2 flex items-center">
              <p className="text-lg mr-1">{currentRide.driver?.rating}</p>
              <span className="text-yellow-400">★</span>
            </div>
          </div>
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
          <MessageCircle size={24} />
        </div>
      </div>
    </div>;
};
export default RideDetails;