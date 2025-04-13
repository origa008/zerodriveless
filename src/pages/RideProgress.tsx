import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';
import { calculateDistance } from '@/lib/utils/mapsApi';
import { Ride } from '@/lib/types';

// Define RideEstimate type to fix the TypeScript error
interface RideEstimate {
  distance: number;
  duration: number;
  baseFare: number;
}

const RideProgress: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    currentRide,
    startRide,
    completeRide,
    cancelRide,
    pickupLocation,
    dropoffLocation,
    selectedRideOption,
    isSearchingRides,
    userBid,
    setUserBid,
    calculateBaseFare
  } = useRide();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimate, setEstimate] = useState<RideEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate route and fare estimate when locations change
  useEffect(() => {
    const calculateEstimate = async () => {
      if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
        return;
      }

      setIsCalculating(true);

      try {
        // Try to use Google Maps Directions API if available
        if (window.google) {
          const directionsService = new window.google.maps.DirectionsService();

          const result = await directionsService.route({
            origin: {
              lat: pickupLocation.coordinates[1],
              lng: pickupLocation.coordinates[0]
            },
            destination: {
              lat: dropoffLocation.coordinates[1],
              lng: dropoffLocation.coordinates[0]
            },
            travelMode: window.google.maps.TravelMode.DRIVING
          });

          if (result.routes[0]) {
            const distance = result.routes[0].legs[0].distance.value / 1000; // Convert to km
            const duration = Math.ceil(result.routes[0].legs[0].duration.value / 60); // Convert to minutes
            const baseFare = calculateBaseFare(distance, selectedRideOption?.name || 'Bike');

            setEstimate({
              distance,
              duration,
              baseFare
            });

            // Set initial bid to base fare
            if (!userBid) {
              setUserBid(baseFare);
            }
            
            setIsCalculating(false);
            return;
          }
        }

        // Fallback to our own distance calculation API
        const distanceResult = await calculateDistance(
          pickupLocation.coordinates,
          dropoffLocation.coordinates
        );

        if (distanceResult) {
          const distance = distanceResult.distance;
          const duration = distanceResult.duration;
          const baseFare = calculateBaseFare(distance, selectedRideOption?.name || 'Bike');

          setEstimate({
            distance,
            duration,
            baseFare
          });

          // Set initial bid to base fare
          if (!userBid) {
            setUserBid(baseFare);
          }
        }
      } catch (error) {
        console.error('Error calculating route:', error);
        toast({
          title: 'Error',
          description: 'Failed to calculate route. Using fallback calculation method.',
          duration: 3000
        });

        // If all else fails, use Haversine formula directly for basic distance calculation
        if (pickupLocation.coordinates && dropoffLocation.coordinates) {
          const [pickupLng, pickupLat] = pickupLocation.coordinates;
          const [dropoffLng, dropoffLat] = dropoffLocation.coordinates;
          
          const R = 6371; // Radius of the earth in km
          const dLat = deg2rad(dropoffLat - pickupLat);
          const dLon = deg2rad(dropoffLng - pickupLng);
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(pickupLat)) * Math.cos(deg2rad(dropoffLat)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          // Estimate duration based on average speed (30 km/h for urban areas)
          const averageSpeedKmH = 30;
          const duration = Math.ceil((distance / averageSpeedKmH) * 60); // Convert to minutes
          const baseFare = calculateBaseFare(distance, selectedRideOption?.name || 'Bike');

          setEstimate({
            distance,
            duration,
            baseFare
          });

          // Set initial bid to base fare
          if (!userBid) {
            setUserBid(baseFare);
          }
        }
      } finally {
        setIsCalculating(false);
      }
    };

    calculateEstimate();
  }, [pickupLocation, dropoffLocation, selectedRideOption, calculateBaseFare, toast, setUserBid, userBid]);

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };

  // Update current ride with real estimates if needed
  useEffect(() => {
    if (currentRide && estimate && currentRide.status === 'searching') {
      // We've calculated actual values while having a current ride in searching state
      // This means we need to update the displayed values for the current ride
      const updatedRide = {
        ...currentRide,
        distance: estimate.distance,
        duration: estimate.duration,
        price: userBid || estimate.baseFare
      };
      
      // Note: We're using a local state update here since we don't have access to context setters
      setLocalRide(updatedRide);
    }
  }, [currentRide, estimate, userBid]);

  // Local state to override current ride when needed
  const [localRide, setLocalRide] = useState<Ride | null>(null);
  
  // Use local ride if available, otherwise use the one from context
  const displayRide = localRide || currentRide;

  const handleCompleteRide = async () => {
    if (!user?.id || !displayRide?.id) {
      toast({
        title: 'Error',
        description: 'Unable to complete ride due to missing information',
        duration: 3000
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      await completeRide();
      
      toast({
        title: "Ride Completed",
        description: displayRide.paymentMethod === 'wallet' 
          ? "Payment has been processed automatically" 
          : "Please collect cash payment from the passenger",
        duration: 5000
      });
      
      // Navigate to ride summary after completion
      navigate('/ride-summary');
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

  // Function to handle confirming a ride
  const handleConfirmRide = () => {
    if (!estimate || !userBid) return;
    
    const paymentMethod = 'cash'; // Default to cash, can be changed if needed
    navigate('/confirm-ride', { 
      state: { 
        distance: estimate.distance,
        duration: estimate.duration,
        baseFare: estimate.baseFare,
        userBid: userBid,
        paymentMethod: paymentMethod
      } 
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <RideMap />
      
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        {displayRide && <RideDetails />}
        
        {isCalculating ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm text-gray-500">Calculating route and fare...</p>
          </div>
        ) : estimate ? (
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Distance</p>
                <p className="font-semibold">{estimate.distance.toFixed(1)} km</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-semibold">{estimate.duration} mins</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Base Fare</p>
                <p className="font-semibold">RS {estimate.baseFare}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <MapPin className="h-4 w-4 text-blue-500 mr-2" />
                  <p className="text-sm font-medium">{pickupLocation?.name}</p>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-green-500 mr-2" />
                  <p className="text-sm font-medium">{dropoffLocation?.name}</p>
                </div>
              </div>

              {/* Only show bid input when ride is not yet started */}
              {(!displayRide || displayRide.status === 'searching') && (
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">
                    Your Bid (RS)
                  </label>
                  <Input
                    type="number"
                    value={userBid || ''}
                    onChange={(e) => setUserBid(Number(e.target.value))}
                    min={estimate.baseFare}
                    className="text-lg font-semibold"
                  />
                  {userBid !== null && userBid < estimate.baseFare && (
                    <p className="text-red-500 text-sm mt-1">
                      Bid cannot be lower than base fare
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm text-gray-500">Calculating route...</p>
          </div>
        )}

        {/* Show different buttons based on ride status */}
        {displayRide?.status === 'confirmed' && (
          <Button
            className="w-full bg-green-600 text-white hover:bg-green-700 py-6 text-xl rounded-xl"
            onClick={() => startRide()}
          >
            Start Ride
          </Button>
        )}

        {displayRide?.status === 'in_progress' && (
          <Button
            className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl"
            onClick={handleCompleteRide}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete Ride'
            )}
          </Button>
        )}

        {!displayRide && estimate && (
          <Button
            className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl"
            disabled={isSearchingRides || !estimate || !userBid || userBid < (estimate?.baseFare || 0)}
            onClick={handleConfirmRide}
          >
            Confirm Ride
          </Button>
        )}

        {/* Cancel button for in-progress rides */}
        {displayRide && displayRide.status !== 'completed' && (
          <Button
            variant="outline"
            className="w-full mt-2 border-red-300 text-red-500 hover:bg-red-50"
            onClick={() => {
              if (displayRide?.id) {
                cancelRide(displayRide.id, "Cancelled by driver");
                navigate('/home');
              }
            }}
          >
            Cancel Ride
          </Button>
        )}
      </div>
    </div>
  );
};

export default RideProgress;
