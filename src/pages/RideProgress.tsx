import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import RealTimeStats from '@/components/ride/RealTimeStats';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
  const [estimate, setEstimate] = useState<RideEstimate | null>(null);

  // Calculate route and fare estimate when locations change
  useEffect(() => {
    const calculateEstimate = async () => {
      if (!pickupLocation?.latitude || !pickupLocation?.longitude || 
          !dropoffLocation?.latitude || !dropoffLocation?.longitude || 
          !window.google) {
        return;
      }

      const directionsService = new window.google.maps.DirectionsService();

      try {
        const result = await directionsService.route({
          origin: {
            lat: pickupLocation.latitude,
            lng: pickupLocation.longitude
          },
          destination: {
            lat: dropoffLocation.latitude,
            lng: dropoffLocation.longitude
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
        }
      } catch (error) {
        console.error('Error calculating route:', error);
        toast({
          title: 'Error',
          description: 'Failed to calculate route. Please try again.',
          duration: 3000
        });
      }
    };

    calculateEstimate();
  }, [pickupLocation, dropoffLocation, selectedRideOption]);

  const handleConfirmRide = async () => {
    if (!user?.id || !estimate || !userBid) {
      toast({
        title: 'Error',
        description: 'Please set a bid amount to continue',
        duration: 3000
      });
      return;
    }

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

  return (
    <div className="min-h-screen bg-white">
      <RideMap />
      
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        {estimate ? (
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
                {userBid && userBid < estimate.baseFare && (
                  <p className="text-red-500 text-sm mt-1">
                    Bid cannot be lower than base fare
                  </p>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        <Button
          className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl"
          onClick={handleConfirmRide}
          disabled={isProcessing || isSearchingRides || !estimate || !userBid || userBid < (estimate?.baseFare || 0)}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm Ride'
          )}
        </Button>
      </div>
    </div>
  );
};

export default RideProgress;
