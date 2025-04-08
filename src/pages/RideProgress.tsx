
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import { completeRideAndProcessPayment } from '@/lib/utils/rideUtils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PhoneCall, MessageSquare } from 'lucide-react';

const RideProgress: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    currentRide,
    startRide,
    completeRide,
    cancelRide
  } = useRide();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    // Start the ride automatically when the page loads
    if (currentRide && currentRide.status === 'confirmed') {
      startRide();
    }
  }, [currentRide, startRide]);

  useEffect(() => {
    // If ride is completed, navigate to ride-completed
    if (currentRide && currentRide.status === 'completed') {
      navigate('/ride-completed');
    }
  }, [currentRide, navigate]);

  if (!currentRide) {
    navigate('/');
    return null;
  }

  const handleCancel = () => {
    cancelRide();
    navigate('/');
  };

  const handleComplete = async () => {
    if (!user?.id || !currentRide) return;
    
    setIsProcessing(true);
    
    try {
      // Process payment if needed and complete the ride
      const { success, error } = await completeRideAndProcessPayment(currentRide.id);
      
      if (!success || error) {
        throw new Error(error || "Failed to complete ride");
      }
      
      completeRide();
      
      toast({
        title: "Ride Completed",
        description: currentRide.paymentMethod === 'wallet' 
          ? "Payment has been processed automatically" 
          : "Please collect cash payment from the passenger",
        duration: 5000
      });
    } catch (error: any) {
      console.error("Failed to complete ride:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete ride",
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCall = () => {
    toast({
      title: "Calling...",
      description: "Connecting you to the passenger",
      duration: 3000
    });
    setShowContactModal(false);
  };
  
  const handleMessage = () => {
    toast({
      title: "Message sent",
      description: "Your message has been sent to the passenger",
      duration: 3000
    });
    setShowContactModal(false);
  };

  // Vehicle images for display
  const vehicleImages = {
    Bike: '/lovable-uploads/0d7f05c1-2df7-4e64-a799-3c8ee43c1f1f.png',
    Auto: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png'
  };

  return (
    <div className="min-h-screen bg-white">
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
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Passenger Contact</h3>
          <div className="flex justify-between mb-4">
            <Button 
              variant="outline" 
              className="flex-1 mr-2 py-6"
              onClick={() => setShowContactModal(true)}
            >
              <PhoneCall className="mr-2" size={18} /> Call Passenger
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 ml-2 py-6"
              onClick={() => navigate('/chat')}
            >
              <MessageSquare className="mr-2" size={18} /> Message
            </Button>
          </div>
        </div>
        
        <div className="p-6 bg-white mt-4">
          {currentRide.status === 'in_progress' ? (
            <Button 
              className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl" 
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Completed'
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-gray-300 py-6 text-xl rounded-xl" 
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          )}
          
          {currentRide.paymentMethod === 'wallet' && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Payment will be processed automatically from passenger's wallet
            </p>
          )}
          {currentRide.paymentMethod === 'cash' && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Please collect cash payment of {currentRide.price} RS from passenger
            </p>
          )}
        </div>
      </div>
      
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Contact Passenger</h3>
            
            <div className="flex justify-center space-x-6 my-4">
              <button 
                onClick={handleCall}
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-full w-24 h-24"
              >
                <PhoneCall size={32} className="text-green-500 mb-2" />
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
    </div>
  );
};

export default RideProgress;
