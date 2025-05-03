
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, Phone, Star, ArrowLeft } from 'lucide-react';
import { calculateDistance } from '@/lib/utils/rideRequests';
import { RideRequest } from '@/lib/types';
import { getAvailableRideRequests, acceptRideRequest } from '@/lib/utils/rideUtils';
import { useLocationTracking } from '@/hooks/useLocationTracking';

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setCurrentRide, setDriverMode, isDriverMode } = useRide();
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  const { coordinates } = useLocationTracking();

  useEffect(() => {
    // Redirect if not in driver mode
    if (!isDriverMode) {
      navigate('/');
    }

    // Check if user is eligible to be a driver
    if (!user?.isVerifiedDriver) {
      toast({
        title: "Not Authorized",
        description: "You need to be a verified driver to access this page",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    // Load ride requests
    loadRideRequests();

    // Set up polling for new ride requests
    const interval = setInterval(loadRideRequests, 15000);
    return () => clearInterval(interval);
  }, [isDriverMode, user, navigate]);

  const loadRideRequests = async () => {
    setLoading(true);
    try {
      if (!user?.id) return;
      
      const { rides, error } = await getAvailableRideRequests(user.id);
      
      if (error) {
        console.error("Error loading ride requests:", error);
        toast({
          title: "Error",
          description: "Failed to load ride requests",
          variant: "destructive"
        });
        return;
      }
      
      setRideRequests(rides || []);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = async (ride: RideRequest) => {
    if (!user?.id || !coordinates) return;
    
    setAcceptingRide(ride.id);
    
    try {
      const { success, error } = await acceptRideRequest(ride.id, user.id, {
        latitude: coordinates[1],
        longitude: coordinates[0]
      });
      
      if (success) {
        toast({
          title: "Ride Accepted",
          description: "You have successfully accepted this ride"
        });
        
        // Set as current ride and navigate
        setCurrentRide({
          id: ride.id,
          pickup: ride.pickup_location,
          dropoff: ride.dropoff_location,
          rideOption: ride.ride_option,
          price: ride.price,
          distance: ride.distance,
          duration: ride.duration,
          status: 'confirmed',
          paymentMethod: ride.payment_method as any,
          currency: ride.currency,
          // Add driver details for completeness
          driver: {
            id: user.id,
            name: user.name || ""
          }
        });
        
        navigate('/ride-progress');
      } else {
        toast({
          title: "Error",
          description: error || "Failed to accept ride",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error accepting ride:", err);
      toast({
        title: "Error",
        description: "Failed to accept the ride",
        variant: "destructive"
      });
    } finally {
      setAcceptingRide(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')} 
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold">Available Ride Requests</h1>
        <Button 
          onClick={loadRideRequests} 
          variant="outline" 
          size="sm" 
          className="ml-auto"
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading ride requests...</p>
          </div>
        ) : rideRequests.length > 0 ? (
          <div className="grid gap-4">
            {rideRequests.map(ride => {
              // Calculate distance between pickup and current location if available
              let distanceToPickup = null;
              if (coordinates && ride.pickup) {
                const pickupLocation = ride.pickup;
                distanceToPickup = calculateDistance(
                  coordinates,
                  [pickupLocation.coordinates[0], pickupLocation.coordinates[1]]
                );
              }
              
              return (
                <Card key={ride.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="bg-blue-500">{ride.ride_option.name}</Badge>
                      <div className="text-right">
                        <p className="font-bold text-lg">{ride.price} {ride.currency}</p>
                        <p className="text-gray-500 text-sm">{ride.distance} km</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start">
                        <div className="min-w-8 mr-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mx-auto"></div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Pickup</p>
                          <p className="font-medium">{ride.pickup?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="min-w-8 mr-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-2 mx-auto"></div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Dropoff</p>
                          <p className="font-medium">{ride.dropoff?.name}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span className="flex items-center">
                        <Clock size={16} className="mr-1" />
                        {ride.duration} min
                      </span>
                      
                      {distanceToPickup !== null && (
                        <span className="flex items-center">
                          <MapPin size={16} className="mr-1" />
                          {distanceToPickup.toFixed(1)} km away
                        </span>
                      )}
                      
                      {ride.passenger && (
                        <span className="flex items-center">
                          <User size={16} className="mr-1" />
                          {ride.passenger.name || "Anonymous"}
                        </span>
                      )}
                    </div>
                    
                    <Button
                      className="w-full bg-green-500 hover:bg-green-600"
                      disabled={acceptingRide === ride.id}
                      onClick={() => handleAcceptRide(ride)}
                    >
                      {acceptingRide === ride.id ? 'Accepting...' : 'Accept Ride'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-gray-600 mb-4">No ride requests available at the moment</p>
            <Button onClick={loadRideRequests}>Refresh</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideRequests;
