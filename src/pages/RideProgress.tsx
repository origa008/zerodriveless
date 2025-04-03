
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
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (currentRide && currentRide.status === 'confirmed') {
      startRide();
    }
    
    if (currentRide && currentRide.status === 'searching') {
      // Set a 60-second timeout for driver acceptance
      const timeout = setTimeout(() => {
        setTimeoutExpired(true);
        setShowBidIncrease(true);
      }, 60000);
      
      return () => clearTimeout(timeout);
    }
  }, [currentRide, startRide]);

  useEffect(() => {
    if (currentRide && currentRide.status === 'completed') {
      navigateToPage('/ride-completed');
    }
    
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
    if (!currentRide) return;
    
    // Increase bid by 20%
    const increasedBid = Math.round(currentRide.price * 1.2);
    
    // Update ride with new bid in the database
    supabase
      .from('rides')
      .update({ price: increasedBid })
      .eq('id', currentRide.id)
      .then(({ error }) => {
        if (error) {
          toast({
            title: "Bid Update Failed",
            description: "Could not update your bid. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Update local state
        setCurrentRide({
          ...currentRide,
          price: increasedBid
        });
        
        toast({
          title: "Bid Increased",
          description: `Your bid has been increased to ${increasedBid} RS to attract drivers.`,
          duration: 5000
        });
        
        setShowBidIncrease(false);
        setTimeoutExpired(false);
        
        // Reset the timer
        setTimeout(() => {
          if (currentRide.status === 'searching') {
            setTimeoutExpired(true);
            setShowBidIncrease(true);
          }
        }, 60000);
      });
  };

  const vehicleImages = {
    Bike: '/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png',
    Auto: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png'
  };
  
  const isDriver = user?.id === currentRide?.driver?.id;

  if (!currentRide) {
    return null;
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
      
      {currentRide && currentRide.status !== 'completed' && (
        <ChatIcon ride={currentRide} variant="both" />
      )}

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
                value={newBidAmount || (currentRide.price * 1.2).toFixed(0)}
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
