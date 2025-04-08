
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
import { AlertTriangle, MapPin, RefreshCw, Star, Wallet } from 'lucide-react';
import { Ride } from '@/lib/types';
import RideOptionCard from '@/components/ride/RideOptionCard';

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptRideRequest, setCurrentRide, walletBalance } = useRide();
  
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Fetch ride requests
  const fetchRideRequests = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsRefreshing(true);
    try {
      console.log("Fetching available ride requests...");
      const { rides, error } = await getAvailableRideRequests(user.email);
      
      if (!error) {
        console.log("Fetched rides:", rides);
        setPendingRideRequests(rides || []);
      } else {
        console.error("Error fetching rides:", error);
        toast({
          title: "Error",
          description: "Failed to fetch ride requests. Please try again.",
          duration: 3000
        });
      }
    } catch (err) {
      console.error("Exception fetching rides:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        duration: 3000
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Fetch and subscribe to nearby ride requests
  useEffect(() => {
    if (!user?.id) return;
    
    fetchRideRequests();
    
    // Subscribe to real-time ride request updates
    const unsubscribe = subscribeToNewRideRequests((newRide) => {
      console.log("New ride request received:", newRide);
      setPendingRideRequests(prevRides => {
        // Check if ride already exists
        if (prevRides.some(ride => ride.id === newRide.id)) {
          return prevRides;
        }
        return [newRide, ...prevRides];
      });
      
      toast({
        title: "New Ride Request",
        description: "A new ride request is available nearby",
        duration: 3000
      });
    });
    
    return () => unsubscribe();
  }, [user?.id, toast]);

  // Handle refreshing ride requests
  const handleRefresh = () => {
    fetchRideRequests();
  };

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
        driver: {
          id: user.id,
          name: user.name || 'Driver',
          rating: user.rating || 5.0,
          licensePlate: "Default",
          avatar: user.avatar || "/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png"
        },
        status: 'confirmed',
        price: ride.price,
        currency: ride.currency || 'RS',
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
        
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-700">
            {!isLoading && !showDriverRegistrationAlert && !showDepositAlert && 
             `${pendingRideRequests.length} ride requests available`}
          </p>
          <Button 
            size="sm"
            variant="outline"
            className="flex items-center"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
        
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
              <RideOptionCard
                key={request.id}
                option={request.ride_option}
                distance={request.distance}
                duration={request.duration}
                pickupLocation={request.pickup_location.name}
                dropoffLocation={request.dropoff_location.name}
                price={request.price}
                currency={request.currency}
                onSelect={() => handleAcceptRide(request)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RideRequests;
