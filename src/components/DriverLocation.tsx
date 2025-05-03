import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { updateDriverLocation } from '@/lib/utils/driverLocation';

export const DriverLocation: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const updateLocation = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Update location in Supabase
      await updateDriverLocation(user.id, [position.coords.latitude, position.coords.longitude]);

      toast({
        title: 'Success',
        description: 'Location updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update location',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <Button
        onClick={updateLocation}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating Location...
          </>
        ) : (
          'Update Location'
        )}
      </Button>
    </div>
  );
};
