import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, ArrowLeft } from 'lucide-react';
import { RideRequest } from '@/lib/types';
import { 
  getNearbyRideRequests, 
  acceptRideRequestSafe, 
  isEligibleDriver, 
  subscribeToNewRidesInArea 
} from '@/lib/utils/dbFunctions';
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
    // Start location tracking
    const locationWatchId = navigator.geolocation.watchPosition(
      position => {
        console.log("Location update:", position.coords);
      },
      error => {
        console.error("Location error:", error);
        toast({
          title: "Location Error",
          description: "Please enable location services to use driver mode",
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true }
    );

    // Cleanup
    return () => {
      navigator.geolocation.clearWatch(locationWatchId);
    };
  }, []);

  useEffect(() => {
    // Check driver eligibility on component mount
    const checkDriverEligibility = async () => {
      if (!user?.id) {
        navigate('/login');
        return;
      }

      setLoading(true);
      
      try {
        const result = await isEligibleDriver(user.id);
        
        if (!result.eligible) {
          // Driver is not eligible
          toast({
            title: "Not Authorized",
            description: result.reason || "You need to complete the driver registration process",
            variant: "destructive"
          });
          
          // Navigate to the appropriate page
          navigate(result.redirectTo || '/register-driver');
          return;
        }
        
        // Driver is eligible, make sure mode is set correctly
        setDriverMode(true);
        
        // Load ride requests if coordinates are available
        if (coordinates) {
          loadRideRequests();
          
          // Set up subscription for real-time updates
          const unsubscribe = subscribeToNewRidesInArea(
            { latitude: coordinates[1], longitude: coordinates[0] },
            10, // 10km radius
            (updatedRides) => {
              console.log("Received updated rides:", updatedRides);
              setRideRequests(updatedRides);
            }
          );
          
          // Cleanup subscription on unmount
          return () => {
            unsubscribe();
          };
        }
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
        toast({
          title: "Error",
          description: "Could not verify driver status",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkDriverEligibility();
  }, [user, coordinates, navigate, setDriverMode]);

  const loadRideRequests = async () => {
    if (!coordinates) {
      toast({
        title: "Location Required",
        description: "Please enable location services to see ride requests",
        variant: "default"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: rides, error } = await getNearbyRideRequests(
        coordinates[1], // latitude
        coordinates[0], // longitude
        10 // 10km radius
      );
      
      if (error) {
        console.error("Error loading ride requests:", error);
        toast({
          title: "Error",
          description: "Failed to load ride requests",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Loaded rides:", rides);
      setRideRequests(rides || []);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      toast({
        title: "Error",
        description: "Could not load ride requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = async (ride: RideRequest) => {
    if (!user?.id || !coordinates) {
      toast({
        title: "Error",
        description: "Location or user information missing",
        variant: "destructive"
      });
      return;
    }
    
    setAcceptingRide(ride.id);
    
    try {
      const { success, error, ride: acceptedRide } = await acceptRideRequestSafe(
        ride.id, 
        user.id,
        {
          latitude: coordinates[1],
          longitude: coordinates[0]
        }
      );
      
      if (success && acceptedRide) {
        toast({
          title: "Ride Accepted",
          description: "You have successfully accepted this ride"
        });
        
        // Set as current ride
        setCurrentRide({
          id: acceptedRide.id,
          pickup: acceptedRide.pickup_location,
          dropoff: acceptedRide.dropoff_location,
          rideOption: acceptedRide.ride_option, // Fixed property name to match Ride type
          price: acceptedRide.price,
          distance: acceptedRide.distance,
          duration: acceptedRide.duration,
          status: 'confirmed',
          paymentMethod: acceptedRide.payment_method,
          currency: acceptedRide.currency,
          passenger: acceptedRide.passenger,
          // Add other details as needed
        });
        
        // Navigate to the ride progress page
        navigate('/ride-progress');
      } else {
        toast({
          title: "Error",
          description: error || "Failed to accept ride. Please try again.",
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
              let distanceToPickup = ride.distance_to_pickup || null;
              
              return (
                <Card key={ride.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="bg-blue-500">
                        {typeof ride.ride_option === 'object' && ride.ride_option !== null && 'name' in ride.ride_option
                          ? ride.ride_option.name
                          : 'Standard'}
                      </Badge>
                      <div className="text-right">
                        <p className="font-bold text-lg">{ride.price} {ride.currency || 'RS'}</p>
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
                          <p className="font-medium">
                            {typeof ride.pickup_location === 'object' && ride.pickup_location !== null && 'name' in ride.pickup_location
                              ? ride.pickup_location.name
                              : 'Pickup Location'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="min-w-8 mr-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-2 mx-auto"></div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Dropoff</p>
                          <p className="font-medium">
                            {typeof ride.dropoff_location === 'object' && ride.dropoff_location !== null && 'name' in ride.dropoff_location
                              ? ride.dropoff_location.name
                              : 'Dropoff Location'}
                          </p>
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
