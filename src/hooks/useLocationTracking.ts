import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateDriverLocation } from '@/lib/utils/driverLocation';

export function useLocationTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let watchId: number | null = null;

    const startTracking = async () => {
      if (!user?.id) return;

      try {
        // Request permission for continuous location updates
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        // Start watching position
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              const coordinates = [position.coords.longitude, position.coords.latitude] as [number, number];
              const success = await updateDriverLocation(user.id, coordinates);
              
              if (!success) {
                setError('Failed to update location');
                toast({
                  title: 'Error',
                  description: 'Failed to update location',
                  variant: 'destructive',
                });
              }
            } catch (error) {
              console.error('Error updating location:', error);
              setError('Failed to update location');
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            setError('Failed to get location');
            toast({
              title: 'Error',
              description: 'Failed to get location',
              variant: 'destructive',
            });
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );

        setIsTracking(true);
        setError(null);
      } catch (error) {
        setError('Failed to start location tracking');
        toast({
          title: 'Error',
          description: 'Failed to start location tracking',
          variant: 'destructive',
        });
      }
    };

    if (!isTracking && !error) {
      startTracking();
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setIsTracking(false);
      }
    };
  }, [user?.id, error]);

  return { isTracking, error };
}
