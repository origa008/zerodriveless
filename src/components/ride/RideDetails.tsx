
import React, { useState } from 'react';
import { useRide } from '@/lib/context/RideContext';
import { MapPin, Clock, User, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const RideDetails = () => {
  const { currentRide, rideTimer, isDriverMode } = useRide();
  const { toast } = useToast();
  const [showContactOptions, setShowContactOptions] = useState(false);

  if (!currentRide) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = () => {
    toast({
      title: "Calling...",
      description: `Connecting you to the ${isDriverMode ? 'passenger' : 'driver'}`,
      duration: 3000
    });
    setShowContactOptions(false);
  };

  const handleMessage = () => {
    toast({
      title: "Message sent",
      description: `Your message has been sent to the ${isDriverMode ? 'passenger' : 'driver'}`,
      duration: 3000
    });
    setShowContactOptions(false);
  };

  return (
    <div className="bg-white -mt-6 rounded-t-3xl p-6 relative z-10">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            {currentRide.status === 'in_progress' ? 'In Ride' : 'Ride Confirmed'}
          </h2>
          <p className="text-gray-500">
            {currentRide.distance} km • ~{currentRide.duration} min
          </p>
        </div>
        {currentRide.status === 'in_progress' && (
          <div className="bg-gray-100 px-3 py-1 rounded-full">
            <p className="font-medium">{formatTime(rideTimer)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center mb-6">
        <div className="w-16 h-16 rounded-lg bg-gray-100 mr-4 flex items-center justify-center overflow-hidden">
          <img 
            src={currentRide.rideOption.name === 'Bike' 
              ? '/lovable-uploads/debf7624-f989-4b17-a657-b4eb13735f8b.png' 
              : '/lovable-uploads/413bd9ac-22fa-4c69-aa6c-991edcf8f3ff.png'} 
            alt={currentRide.rideOption.name} 
            className="h-12 object-contain" 
          />
        </div>
        <div>
          <p className="font-medium">{currentRide.rideOption.name}</p>
          <p className="text-gray-500">{currentRide.rideOption.currency} {currentRide.price}</p>
          {currentRide.paymentMethod && (
            <p className="text-xs text-gray-500">Payment: {currentRide.paymentMethod === 'wallet' ? 'Wallet' : 'Cash'}</p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl mb-6">
        <div className="flex mb-3">
          <MapPin className="text-gray-500 mr-3 mt-1 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm text-gray-500">Pickup</p>
            <p>{currentRide.pickup.name}</p>
          </div>
        </div>
        <div className="flex">
          <MapPin className="text-gray-500 mr-3 mt-1 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm text-gray-500">Dropoff</p>
            <p>{currentRide.dropoff.name}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
            <img
              src={isDriverMode 
                ? '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png' 
                : currentRide.driver?.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'}
              alt={isDriverMode ? 'Passenger' : 'Driver'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-medium">
              {isDriverMode ? 'Passenger' : `${currentRide.driver?.name || 'Your Driver'}`}
            </p>
            {!isDriverMode && currentRide.driver?.rating && (
              <p className="text-sm text-gray-500">
                ★ {currentRide.driver.rating} • {currentRide.driver.licensePlate}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="border-gray-300"
            onClick={() => setShowContactOptions(true)}
          >
            Contact
          </Button>
        </div>
      </div>

      {showContactOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">
              Contact {isDriverMode ? 'Passenger' : 'Driver'}
            </h3>
            
            <div className="flex justify-center space-x-6 my-4">
              <button 
                onClick={handleCall}
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-full w-24 h-24"
              >
                <Phone size={32} className="text-green-500 mb-2" />
                <span>Call</span>
              </button>
              
              <button
                onClick={handleMessage}
                className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-full w-24 h-24"
              >
                <MessageSquare size={32} className="text-blue-500 mb-2" />
                <span>Message</span>
              </button>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowContactOptions(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideDetails;
