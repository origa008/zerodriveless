import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
    pickupLocation,
    dropoffLocation,
    selectedRideOption,
    setUserBid,
    userBid,
    confirmRide,
    isSearchingRides,
    calculateBaseFare
  } = useRide();

  const [isProcessing, setIsProcessing] = useState(false);
  const [estimate, setEstimate] = useState<RideEstimate | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [actualDistance, setActualDistance] = useState(0);
  const [actualFare, setActualFare] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{lat: number, lng: number} | null>(null);

  // Initial route calculation when locations change
  useEffect(() => {
    calculateInitialEstimate();
  }, [pickupLocation, dropoffLocation, selectedRideOption]);

  // Start tracking for actual ride metrics when the component mounts
  useEffect(() => {
    startTracking();
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Update fare in real-time based on elapsed time and distance
  useEffect(() => {
    if (selectedRideOption && actualDistance > 0) {
      const ratePerKm = selectedRideOption.name === 'Bike' ? 20 : 35;
      const ratePerMinute = selectedRideOption.name === 'Bike' ? 2 : 3;
      
      const distanceFare = actualDistance * ratePerKm;
      const timeFare = (elapsedTime / 60) * ratePerMinute;
      
      setActualFare(Math.round(distanceFare + timeFare));
    }
  }, [actualDistance, elapsedTime, selectedRideOption]);

  const calculateInitialEstimate = async () => {
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

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser.',
        duration: 3000
      });
      return;
    }

    startTimeRef.current = Date.now();
    
    // Start timer
    const timerInterval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    // Start location tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPosition = { lat: latitude, lng: longitude };
        
        setCurrentLocation(newPosition);
        
        // Calculate distance traveled since last position
        if (lastPositionRef.current) {
          const newDistance = calculateHaversineDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            latitude,
            longitude
          );
          
          if (newDistance > 0.01) { // Only count movements greater than 10 meters
            setActualDistance(prevDistance => prevDistance + newDistance);
            lastPositionRef.current = newPosition;
          }
        } else {
          lastPositionRef.current = newPosition;
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: 'Location Error',
          description: 'Unable to track your location.',
          duration: 3000
        });
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    return () => {
      clearInterval(timerInterval);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

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
      // Create ride request in Supabase
      const { data: ride, error } = await supabase
        .from('rides')
        .insert({
          passenger_id: user.id,
          pickup_location: {
            name: pickupLocation?.name,
            latitude: pickupLocation?.latitude,
            longitude: pickupLocation?.longitude,
            placeId: pickupLocation?.placeId
          },
          dropoff_location: {
            name: dropoffLocation?.name,
            latitude: dropoffLocation?.latitude,
            longitude: dropoffLocation?.longitude,
            placeId: dropoffLocation?.placeId
          },
          vehicle_type: selectedRideOption?.name.toLowerCase(),
          bid_amount: userBid,
          estimated_distance: estimate.distance,
          estimated_duration: estimate.duration,
          status: 'searching',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Call the confirmRide function from context
      await confirmRide('wallet');

      toast({
        title: 'Success',
        description: 'Your ride request has been created. Waiting for a driver...',
        duration: 5000
      });

      // Navigate to waiting screen
      navigate('/waiting-driver');
    } catch (error: any) {
      console.error('Error creating ride request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ride request',
        duration: 3000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="h-[60vh]">
        <RideMap />
      </div>
      
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        {estimate ? (
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Distance</p>
                <p className="font-semibold">{actualDistance > 0 ? actualDistance.toFixed(1) : estimate.distance.toFixed(1)} km</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-semibold">{elapsedTime > 0 ? formatTime(elapsedTime) : `${estimate.duration} mins`}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">{selectedRideOption?.name || 'Bike'} Fare</p>
                <p className="font-semibold">₹ {actualFare > 0 ? actualFare : estimate.baseFare}</p>
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
                  Your Bid (₹)
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
