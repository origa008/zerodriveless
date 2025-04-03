
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import ChatIcon from '@/components/chat/ChatIcon';
import { ArrowLeft, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RideProgress: React.FC = () => {
  const { user } = useAuth();
  const {
    currentRide,
    startRide,
    completeRide,
    cancelRide,
    navigateToPage
  } = useRide();
  
  const { toast } = useToast();
  const [timeoutExpired, setTimeoutExpired] = useState(false);
  const [showBidIncrease, setShowBidIncrease] = useState(false);
  const [newBidAmount, setNewBidAmount] = useState(0);

  useEffect(() => {
    // Start the ride automatically when the page loads
    if (currentRide && currentRide.status === 'confirmed') {
      startRide();
    }
    
    // Set a timeout to auto-redirect if no driver accepts within 1 minute
    if (currentRide && currentRide.status === 'searching') {
      const timeout = setTimeout(() => {
        setTimeoutExpired(true);
        setShowBidIncrease(true);
      }, 60000); // 1 minute
      
      return () => clearTimeout(timeout);
    }
  }, [currentRide, startRide]);

  useEffect(() => {
    // If ride is completed, navigate to ride-completed
    if (currentRide && currentRide.status === 'completed') {
      navigateToPage('/ride-completed');
    }
    
    // If there's no current ride, redirect to home
    if (!currentRide) {
      navigateToPage('/');
    }
  }, [currentRide, navigateToPage]);

  const handleCancel = () => {
    cancelRide();
    navigateToPage('/');
  };

  const handleComplete = () => {
    completeRide();
  };

  const handleCallDriver = () => {
    if (currentRide?.driver?.phone) {
      window.location.href = `tel:${currentRide.driver.phone}`;
    } else {
      toast({
        title: "Cannot place call",
        description: "Driver phone number is not available",
        variant: "destructive"
      });
    }
  };

  const handleCallPassenger = () => {
    if (currentRide?.passenger?.phone) {
      window.location.href = `tel:${currentRide.passenger.phone}`;
    } else {
      toast({
        title: "Cannot place call",
        description: "Passenger phone number is not available",
        variant: "destructive"
      });
    }
  };

  const handleIncreaseBid = () => {
    // Logic for increasing bid would be implemented here
    // For now, we'll just close the dialog
    setShowBidIncrease(false);
    setTimeoutExpired(false);
    // In a real implementation, this would update the bid and restart the search
  };

  // Vehicle images for display
  const vehicleImages = {
    Bike: '/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png',
    Auto: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png'
  };
  
  const isDriver = user?.id === currentRide?.driver?.id;

  if (!currentRide) {
    return null; // We'll redirect in the useEffect above
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={() => navigateToPage('/')}
          className="bg-white p-2 rounded-full shadow-md"
        >
          <ArrowLeft size={24} />
        </button>
      </div>
      
      <RideMap />
      
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        {/* Vehicle image */}
        <div className="mb-4 flex justify-center">
          {currentRide.rideOption.name === 'Bike' ? (
            <img 
              src={vehicleImages.Bike} 
              alt="Bike" 
              className="h-24 object-contain mx-auto"
            />
          ) : (
            <img 
              src={vehicleImages.Auto} 
              alt="Auto" 
              className="h-24 object-contain mx-auto"
            />
          )}
        </div>
        
        <RideDetails />
        
        {/* Call button */}
        {currentRide.status !== 'completed' && (
          <div className="mb-4 flex justify-center">
            <button 
              onClick={isDriver ? handleCallPassenger : handleCallDriver}
              className="flex items-center justify-center p-3 bg-green-500 text-white rounded-full shadow-md"
            >
              <Phone size={24} />
            </button>
            <span className="ml-2 mt-2">
              Call {isDriver ? "Passenger" : "Driver"}
            </span>
          </div>
        )}
        
        <div className="p-6 bg-white">
          {currentRide.status === 'in_progress' ? (
            <Button 
              className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl" 
              onClick={handleComplete}
            >
              {isDriver ? "Complete Ride" : "Ride Completed"}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-gray-300 py-6 text-xl rounded-xl" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Chat Icon for communication */}
      {currentRide && currentRide.status !== 'completed' && (
        <ChatIcon ride={currentRide} variant="both" />
      )}

      {/* Bid increase dialog */}
      {showBidIncrease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">No Drivers Available</h3>
            
            <p className="text-gray-600 mb-4">
              No drivers have accepted your ride request in the last minute. Would you like to increase your bid to attract more drivers?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New Bid Amount</label>
              <input 
                type="number" 
                value={newBidAmount || (currentRide.price * 1.2)} // 20% increase
                onChange={(e) => setNewBidAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowBidIncrease(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-black text-white" 
                onClick={handleIncreaseBid}
              >
                Increase Bid
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideProgress;
