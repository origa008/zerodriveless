
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import ModeSwitcher from '@/components/shared/ModeSwitcher';
import { 
  getAvailableRideRequests, 
  subscribeToNewRideRequests,
  acceptRideRequest as acceptRide
} from '@/lib/utils/rideUtils';
import { getDriverRegistrationStatus } from '@/lib/utils/driverUtils';
import { AlertTriangle, Map, MapPin, Star, Wallet } from 'lucide-react';
import { Ride } from '@/lib/types';

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptRideRequest, setCurrentRide, walletBalance } = useRide();
  
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [showDriverRegistrationAlert, setShowDriverRegistrationAlert] = useState(false);
  const [showDepositAlert, setShowDepositAlert] = useState(false);

  // Check driver status on load
  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { status, details } = await getDriverRegistrationStatus(user.id);
        setDriverStatus(status);
        
        // Show alerts based on driver status and deposit
        if (!status || status === null) {
          setShowDriverRegistrationAlert(true);
        } else if (status === 'pending') {
          setShowDriverRegistrationAlert(true);
        } else if (status === 'approved') {
          const hasSufficientDeposit = details?.has_sufficient_deposit || false;
          setShowDepositAlert(!hasSufficientDeposit);
        }
      } catch (error) {
        console.error("Error checking driver status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkDriverStatus();
  }, [user?.id]);

  // Fetch and subscribe to nearby ride requests
  useEffect(() => {
    if (!user?.id || driverStatus !== 'approved' || showDepositAlert) return;
    
    const fetchRideRequests = async () => {
      const { rides, error } = await getAvailableRideRequests();
      
      if (!error) {
        setPendingRideRequests(rides || []);
      }
    };
    
    fetchRideRequests();
    
    // Subscribe to real-time ride request updates
    const unsubscribe = subscribeToNewRideRequests((newRide) => {
      setPendingRideRequests(prevRides => [...prevRides, newRide]);
      
      toast({
        title: "New Ride Request",
        description: "A new ride request is available nearby",
        duration: 3000
      });
    });
    
    return () => unsubscribe();
  }, [user?.id, driverStatus, showDepositAlert, toast]);

  // Handle accepting a ride
  const handleAcceptRide = async (ride: any) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to accept rides",
        duration: 3000
      });
      return;
    }
    
    try {
      const { success, error } = await acceptRide(ride.id, user.id);
      
      if (!success) {
        throw new Error(error || "Failed to accept ride");
      }
      
      const formattedRide: Ride = {
        id: ride.id,
        pickup: ride.pickup_location,
        dropoff: ride.dropoff_location,
        rideOption: ride.ride_option,
        status: 'confirmed',
        price: ride.price,
        currency: ride.currency,
        distance: ride.distance,
        duration: ride.duration,
        paymentMethod: ride.payment_method
      };
      
      acceptRideRequest(ride.id);
      setCurrentRide(formattedRide);
      
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

  const renderAlerts = () => {
    if (showDriverRegistrationAlert) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="text-amber-600 mr-3" />
            <div>
              <h3 className="font-medium text-amber-800">Complete Driver Registration</h3>
              <p className="text-sm text-amber-700">
                You need to complete your driver registration before you can accept ride requests.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => navigate('/official-driver')}
              >
                Register Now
              </Button>
            </div>
          </div>
        </div>
      );
    } else if (showDepositAlert) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <Wallet className="text-blue-600 mr-3" />
            <div>
              <h3 className="font-medium text-blue-800">Security Deposit Required</h3>
              <p className="text-sm text-blue-700">
                You need to add a security deposit of RS 3,000 to your wallet before accepting rides.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => navigate('/wallet')}
              >
                Add Funds
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 relative">
        <ModeSwitcher isDriverEligible={true} />
        <div className="flex justify-between mt-2">
          <h1 className="text-2xl font-bold">Ride Requests</h1>
          <div className="text-right">
            <div className="flex items-center justify-end">
              <Star className="text-yellow-500 mr-1" size={16} />
              <span className="text-gray-700">{user?.rating || 5.0}</span>
            </div>
            <div className="text-sm text-gray-500">Balance: RS {walletBalance}</div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {renderAlerts()}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
          </div>
        ) : showDriverRegistrationAlert || showDepositAlert ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-700 text-lg">Complete the requirements to see ride requests</p>
          </div>
        ) : pendingRideRequests.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-700 text-lg">No ride requests available at the moment</p>
            <p className="text-gray-500 mt-2">Check back later for new requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRideRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      <Map className="text-gray-500" size={16} />
                      <span className="font-medium">{request.distance?.toFixed(1)} km</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-sm">Estimate</div>
                      <div className="font-bold">{Math.round(request.duration / 60)} mins</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-b border-gray-200 py-4 my-4 space-y-4">
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 bg-emerald-100 p-1 rounded-full">
                        <MapPin className="text-emerald-700" size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Pickup</div>
                        <div className="text-gray-600">{request.pickup_location.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 bg-red-100 p-1 rounded-full">
                        <MapPin className="text-red-700" size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Dropoff</div>
                        <div className="text-gray-600">{request.dropoff_location.name}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <div className="text-gray-500">Fare</div>
                      <div className="text-2xl font-bold">{request.price} {request.currency}</div>
                      <div className="text-xs text-green-600">
                        Earn {Math.round(request.price * 0.8)} {request.currency}
                      </div>
                    </div>
                    
                    <Button 
                      className="bg-black text-white px-6 py-2 rounded-full"
                      onClick={() => handleAcceptRide(request)}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RideRequests;
