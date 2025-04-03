import React, { useState } from 'react';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { User, Phone, MapPin, Clock, Navigation, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Chat from './Chat';

const RideDetails: React.FC = () => {
  const { currentRide, isDriverMode, rideTimer, walletBalance } = useRide();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (!currentRide) return null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCall = () => {
    toast({
      title: "Calling...",
      description: `Connecting you to the ${isDriverMode ? 'passenger' : 'driver'}`,
      duration: 3000
    });
    setShowContactModal(false);
  };
  
  const handleMessage = () => {
    setShowContactModal(false);
    setShowChat(true);
  };

  const getPartnerId = () => {
    if (isDriverMode) {
      return currentRide.id.split('-')[0];
    } else {
      return currentRide.driver?.id || '';
    }
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
          </div>
          <div className="ml-auto">
            {!isDriverMode && currentRide.driver?.rating && (
              <div className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                <User size={16} className="mr-1" />
                <span>{currentRide.driver.rating}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-2 h-9 text-blue-500 border-blue-200"
              onClick={() => setShowContactModal(true)}
            >
              Contact
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 mr-3 flex items-center justify-center">
              <img 
                src={currentRide.rideOption.image}
                alt={currentRide.rideOption.name} 
                className="h-10 w-10 object-contain" 
              />
            </div>
            <span className="font-medium">{currentRide.rideOption.name}</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Wallet Balance</p>
            <p className="font-bold">RS {walletBalance.toFixed(0)}</p>
          </div>
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
          {isDriverMode && (
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
              <span className="text-gray-600">Your Earnings:</span>
              <span className="font-bold text-green-600">~{Math.round(currentRide.price * 0.8)} {currentRide.currency}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
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
              onClick={() => setShowContactModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <Chat 
          rideId={currentRide.id} 
          partnerId={getPartnerId()} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </div>
  );
};

export default RideDetails;
