
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateDriverLocation } from '@/lib/utils/driverLocation';

export interface LocationState {
  isTracking: boolean;
  coordinates: [number, number] | null;
  error: string | null;
  lastUpdated: Date | null;
}

export function useLocationTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locationState, setLocationState] = useState<LocationState>({
    isTracking: false,
    coordinates: null,
    error: null,
    lastUpdated: null
  });

  useEffect(() => {
    let watchId: number | null = null;

    const startTracking = async () => {
      if (!user?.id) return;

      try {
        // Request permission for continuous location updates
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        // Update state with initial position
        const initialCoords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setLocationState(prev => ({
          ...prev,
          coordinates: initialCoords,
          lastUpdated: new Date(),
          error: null
        }));

        // Update location in database
        await updateDriverLocation(user.id, initialCoords);

        // Start watching position
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              const coordinates: [number, number] = [position.coords.longitude, position.coords.latitude];
              
              // Only update if position has changed significantly (more than 10 meters)
              const hasChangedSignificantly = !locationState.coordinates || 
                calculateDistance(locationState.coordinates, coordinates) > 0.01;
              
              if (hasChangedSignificantly) {
                const success = await updateDriverLocation(user.id, coordinates);
                
                if (success) {
                  setLocationState(prev => ({
                    ...prev,
                    coordinates,
                    lastUpdated: new Date(),
                    error: null,
                    isTracking: true
                  }));
                } else {
                  console.error('Failed to update location in database');
                }
              }
            } catch (error) {
              console.error('Error in location tracking:', error);
              setLocationState(prev => ({
                ...prev,
                error: 'Failed to update location'
              }));
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            let errorMessage: string;
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
              default:
                errorMessage = 'Unknown location error';
            }
            
            setLocationState(prev => ({
              ...prev,
              error: errorMessage,
              isTracking: false
            }));
            
            toast({
              title: 'Location Error',
              description: errorMessage,
              variant: 'destructive',
            });
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );

        setLocationState(prev => ({
          ...prev,
          isTracking: true
        }));
      } catch (error: any) {
        console.error('Failed to start location tracking:', error);
        const errorMessage = error.message || 'Failed to start location tracking';
        
        setLocationState(prev => ({
          ...prev,
          error: errorMessage,
          isTracking: false
        }));
        
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    if (user?.id && !locationState.isTracking && !locationState.error) {
      startTracking();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user?.id, locationState.isTracking, locationState.error, toast]);

  // Helper function to retry location tracking after an error
  const retryTracking = () => {
    setLocationState(prev => ({
      ...prev,
      error: null,
      isTracking: false
    }));
  };

  return { 
    ...locationState,
    retryTracking
  };
}

// Helper functions
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return distance;
}
