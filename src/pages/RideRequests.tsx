import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import ModeSwitcher from '@/components/shared/ModeSwitcher';
import { Map, MapPin, Star } from 'lucide-react';
import { 
  getNearbyPendingRides,
  subscribeToNearbyPendingRides,
  updateDriverStatus
} from '@/lib/utils/dbFunctions';

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { walletBalance } = useRide();
  
  const [pendingRideRequests, setPendingRideRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);

  // Initialize location tracking
  useEffect(() => {
    const setupLocation = async () => {
      try {
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by your browser');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        setDriverLocation(newLocation);

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const updatedLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setDriverLocation(updatedLocation);
          },
          (error) => {
            console.error('Location watch error:', error);
            toast({
              title: "Location Error",
              description: "Unable to track your location. Please check your settings.",
              duration: 5000
            });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        setLocationWatchId(watchId);
      } catch (error: any) {
        console.error('Location setup error:', error);
        toast({
          title: "Location Error",
          description: "Please enable location access to use the driver app.",
          duration: 5000
        });
      }
    };

    if (user?.id) {
      setupLocation();
    }

    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [user?.id]);

  // Subscribe to nearby rides when online
  useEffect(() => {
    if (!user?.id || !isOnline || !driverLocation) return;

    const unsubscribe = subscribeToNearbyPendingRides(
      user.id,
      driverLocation,
      (rides) => {
        setPendingRideRequests(rides);
        if (rides.length > pendingRideRequests.length) {
          toast({
            title: "New Ride Request",
            description: "New ride requests are available nearby",
            duration: 3000
          });
        }
      },
      5 // 5km radius
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, isOnline, driverLocation]);

  const toggleOnlineStatus = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to go online",
        duration: 3000
      });
      return;
    }

    if (!driverLocation) {
      toast({
        title: "Location Required",
        description: "Please ensure location access is enabled and try again",
        duration: 3000
      });
      return;
    }

    try {
      const newStatus = !isOnline;
      const { success, error } = await updateDriverStatus(
        user.id,
        newStatus,
        driverLocation
      );

      if (!success || error) {
        throw new Error(error || "Failed to update status");
      }

      setIsOnline(newStatus);
      
      toast({
        title: newStatus ? "You're Online" : "You're Offline",
        description: newStatus 
          ? "You can now receive ride requests" 
          : "You won't receive any ride requests",
        duration: 3000
      });

      if (!newStatus) {
        setPendingRideRequests([]);
      }
    } catch (error: any) {
      console.error("Error toggling online status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        duration: 5000
      });
    }
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
        <div className="mt-4">
          <Button
            onClick={toggleOnlineStatus}
            className={isOnline ? "bg-green-500" : "bg-gray-500"}
            disabled={!driverLocation}
          >
            {!driverLocation ? "Waiting for location..." : (isOnline ? "Online" : "Offline")}
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
          </div>
        ) : !isOnline ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-700 text-lg">Go online to see ride requests</p>
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
                      <span className="font-medium">{request.distance_to_pickup.toFixed(1)} km away</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-sm">Estimate</div>
                      <div className="font-bold">{Math.round(request.estimated_duration)} mins</div>
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
                      <div className="text-gray-500">Bid Amount</div>
                      <div className="text-2xl font-bold">RS {request.estimated_price}</div>
                      <div className="text-xs text-green-600">
                        Earn RS {Math.round(request.estimated_price * 0.8)}
                      </div>
                    </div>
                    
                    <Button 
                      className="bg-black text-white px-6 py-2 rounded-full"
                      onClick={() => navigate(`/ride/${request.id}`)}
                    >
                      View Details
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
