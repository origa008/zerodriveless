
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import { 
  getAvailableRideRequests, 
  subscribeToNewRideRequests,
  acceptRideRequest as acceptRide
} from '@/lib/utils/rideUtils';
import { getDriverRegistrationStatus } from '@/lib/utils/driverUtils';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Ride } from '@/lib/types';

const DriverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptRideRequest, setCurrentRide } = useRide();
  
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverStatus, setDriverStatus] = useState<string | null>(null);

  // Check driver status on load
  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { status } = await getDriverRegistrationStatus(user.id);
        setDriverStatus(status);
        
        // If status is not approved, redirect to driver registration
        if (status !== 'approved') {
          toast({
            title: "Driver Registration Required",
            description: "Your application needs to be approved before accepting rides.",
            duration: 3000
          });
          navigate('/official-driver');
        }
      } catch (error) {
        console.error("Error checking driver status:", error);
      }
    };
    
    checkDriverStatus();
  }, [user?.id, navigate, toast]);

  // Fetch and subscribe to nearby ride requests
  useEffect(() => {
    if (!user?.id || driverStatus !== 'approved') return;
    
    setIsLoading(true);
    
    const fetchRideRequests = async () => {
      const { rides, error } = await getAvailableRideRequests();
      
      if (!error) {
        setPendingRideRequests(rides || []);
      }
      
      setIsLoading(false);
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
  }, [user?.id, driverStatus, toast]);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Ride Requests</h1>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
          </div>
        ) : pendingRideRequests.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-700 text-lg">No ride requests available at the moment</p>
            <p className="text-gray-500 mt-2">Pull down to refresh or check back later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRideRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between">
                    <h2 className="text-2xl font-bold mb-4">Ride Request</h2>
                    <div className="text-right">
                      <div className="text-gray-500">Distance</div>
                      <div className="text-2xl font-bold">{request.distance.toFixed(1)} km</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-b border-gray-200 py-4 my-4 space-y-4">
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 text-gray-400">
                        <MapPin className="rotate-180" size={20} />
                      </div>
                      <div>
                        <div className="text-lg">{request.pickup_location.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 text-black">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <div className="text-lg">{request.dropoff_location.name}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <div className="text-gray-500">Price</div>
                      <div className="text-2xl font-bold">{request.price} {request.currency}</div>
                    </div>
                    
                    <Button 
                      className="bg-black text-white px-12 py-6 rounded-full text-lg"
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

export default DriverDashboard;
