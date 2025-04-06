import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { Map, Clock, DollarSign, PhoneCall, MessageSquare, AlertTriangle } from 'lucide-react';
import { Ride } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  getAvailableRideRequests, 
  subscribeToNewRideRequests,
  acceptRideRequest as acceptRide
} from '@/lib/utils/rideUtils';

interface DriverModeProps {
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;
}

const DriverMode: React.FC<DriverModeProps> = ({ isOnline, setIsOnline }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    calculateBaseFare, 
    acceptRideRequest,
    setCurrentRide,
    walletBalance,
    pendingRideRequests, 
    setPendingRideRequests
  } = useRide();
  
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOnline && user?.id && user.driverStatus === 'approved' && user.hasDriverDeposit) {
      setIsLoading(true);
      
      const fetchRideRequests = async () => {
        const { rides, error } = await getAvailableRideRequests();
        
        if (!error) {
          const formattedRides = rides.map(ride => ({
            id: ride.id,
            pickup: ride.pickup_location,
            dropoff: ride.dropoff_location,
            rideOption: ride.ride_option,
            status: ride.status,
            price: ride.price,
            currency: ride.currency,
            distance: ride.distance,
            duration: ride.duration,
            paymentMethod: ride.payment_method
          }));
          
          setPendingRideRequests(formattedRides);
        }
        
        setIsLoading(false);
      };
      
      fetchRideRequests();
      
      const unsubscribe = subscribeToNewRideRequests((newRide) => {
        const formattedRide = {
          id: newRide.id,
          pickup: newRide.pickup_location,
          dropoff: newRide.dropoff_location,
          rideOption: newRide.ride_option,
          status: newRide.status,
          price: newRide.price,
          currency: newRide.currency,
          distance: newRide.distance,
          duration: newRide.duration,
          paymentMethod: newRide.payment_method
        };
        
        setPendingRideRequests(prev => [...prev, formattedRide]);
        
        toast({
          title: "New Ride Request",
          description: "A new ride request is available",
          duration: 3000
        });
      });
      
      return () => unsubscribe();
    }
  }, [isOnline, user?.id, user?.driverStatus, user?.hasDriverDeposit, setPendingRideRequests, toast]);

  const handleGoOnline = () => {
    if (user?.driverStatus !== 'approved') {
      navigate('/official-driver');
      return;
    }
    
    if (!user?.hasDriverDeposit) {
      toast({
        title: "Deposit required",
        description: "You need to add Rs. 3,000 to your wallet before going online",
        duration: 5000
      });
      navigate('/wallet');
      return;
    }
    
    setIsOnline(true);
    toast({
      title: "You're online",
      description: "You'll now receive ride requests",
      duration: 3000
    });
  };

  const handleGoOffline = () => {
    setIsOnline(false);
    toast({
      title: "You're offline",
      description: "You won't receive any new ride requests",
      duration: 3000
    });
  };

  const handleShowBid = (ride: Ride) => {
    setSelectedRide(ride);
    setBidAmount(ride.price);
    setShowBidModal(true);
  };

  const handleAcceptRide = async () => {
    if (!selectedRide || !user?.id) {
      toast({
        title: "Error",
        description: "Failed to accept ride",
        duration: 3000
      });
      return;
    }
    
    try {
      const { success, error } = await acceptRide(selectedRide.id, user.id);
      
      if (!success) {
        throw new Error(error || "Failed to accept ride");
      }
      
      const updatedRide = {
        ...selectedRide,
        price: bidAmount,
      };
      
      acceptRideRequest(selectedRide.id);
      setCurrentRide(updatedRide);
      setShowBidModal(false);
      
      toast({
        title: "Ride accepted",
        description: "You have accepted the ride. Navigating to passenger...",
        duration: 3000
      });
      
      navigate('/ride-progress');
    } catch (error: any) {
      console.error("Error accepting ride:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept ride",
        duration: 3000
      });
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

  const renderDriverStatusMessage = () => {
    if (!user?.isVerifiedDriver) {
      return (
        <div className="flex items-center mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="text-amber-600 mr-2" />
          <span className="text-amber-800 text-sm">Complete driver registration to receive ride requests.</span>
        </div>
      );
    }
    
    if (user?.driverStatus === 'pending') {
      return (
        <div className="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle className="text-blue-600 mr-2" />
          <span className="text-blue-800 text-sm">Your driver application is under review.</span>
        </div>
      );
    }
    
    if (user?.driverStatus === 'approved' && !user?.hasDriverDeposit) {
      return (
        <div className="flex items-center mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="text-amber-600 mr-2" />
          <span className="text-amber-800 text-sm">Add Rs. 3,000 to your wallet to start accepting rides.</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-medium">Driver Mode</h2>
        <div className="text-right">
          <p className="text-sm text-gray-500">Wallet Balance</p>
          <p className="text-xl font-bold">RS {walletBalance.toFixed(0)}</p>
        </div>
      </div>
      
      {renderDriverStatusMessage()}
      
      {!isOnline ? (
        <div>
          <p className="text-gray-600 mb-6">You are currently offline. Go online to receive ride requests.</p>
          
          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl"
            onClick={handleGoOnline}
            disabled={user?.driverStatus !== 'approved' || !user?.hasDriverDeposit}
          >
            {user?.driverStatus === 'approved' && user?.hasDriverDeposit ? 'Go Online' : 
             user?.driverStatus === 'approved' ? 'Add Deposit to Start' : 'Complete Driver Registration'}
          </Button>
          
          {(user?.driverStatus !== 'approved' || !user?.hasDriverDeposit) && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                {user?.driverStatus !== 'approved' 
                  ? 'You need to complete driver registration first.' 
                  : 'You need to add the required deposit to your wallet.'}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => user?.driverStatus !== 'approved' 
                  ? navigate('/official-driver') 
                  : navigate('/wallet')}
              >
                {user?.driverStatus !== 'approved' ? 'Register as Driver' : 'Add Funds'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-green-600 font-medium">You are online</p>
            <Button 
              variant="outline" 
              className="border-gray-300"
              onClick={handleGoOffline}
            >
              Go Offline
            </Button>
          </div>
          
          <h3 className="text-xl font-medium mb-3">Nearby Requests</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Loading ride requests...</p>
            </div>
          ) : pendingRideRequests.length === 0 ? (
            <div className="text-center py-8 border border-gray-200 rounded-xl">
              <p className="text-gray-500">No ride requests available at the moment.</p>
              <p className="text-sm text-gray-400 mt-2">Wait for passengers to place ride requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRideRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
                >
                  <div className="flex justify-between mb-3">
                    <div className="flex items-center">
                      <Map className="text-gray-500 mr-2" size={16} />
                      <p className="font-medium">{request.pickup.name} → {request.dropoff.name}</p>
                    </div>
                    <p className="font-bold">{request.price} {request.currency}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Map className="mr-1" size={14} />
                      <span>{request.distance} km</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-1" size={14} />
                      <span>{request.duration} min</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="mr-1" size={14} />
                      <span>~{Math.round(request.price * 0.8)} profit</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleShowBid(request)}
                    >
                      View & Accept
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-10"
                      onClick={() => setShowContactModal(true)}
                    >
                      <PhoneCall size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBidModal && selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Ride Details</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">Route: {selectedRide.pickup.name} → {selectedRide.dropoff.name}</p>
              <p className="text-gray-600 mb-2">Distance: {selectedRide.distance} km</p>
              <p className="text-gray-600 mb-2">Vehicle: {selectedRide.rideOption.name}</p>
              <p className="text-gray-600 mb-2">Passenger Bid: {selectedRide.price} RS</p>
              <p className="text-gray-600 mb-2">Your Profit: ~{Math.round(selectedRide.price * 0.8)} RS</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Your Counter Bid (RS)</label>
              <input
                type="number"
                min={Math.round(calculateBaseFare(selectedRide.distance, selectedRide.rideOption.name) * 0.9)}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3"
              />
              <p className="text-sm text-gray-500 mt-1">You can set your bid lower to be more competitive</p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowBidModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-black text-white"
                onClick={handleAcceptRide}
              >
                Accept Ride
              </Button>
            </div>
          </div>
        </div>
      )}
      
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

export default DriverMode;
