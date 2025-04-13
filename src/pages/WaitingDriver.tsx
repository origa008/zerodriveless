import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '@/lib/context/RideContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const WaitingDriver: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    currentRide,
    setCurrentRide,
    userBid,
    pickupLocation,
    dropoffLocation,
    cancelRide
  } = useRide();

  useEffect(() => {
    if (!currentRide?.id) {
      navigate('/');
      return;
    }

    // Subscribe to ride status changes
    const channel = supabase
      .channel(`ride_${currentRide.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${currentRide.id}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            navigate('/');
            return;
          }

          const updatedRide = payload.new;
          
          if (updatedRide.status === 'confirmed') {
            // A driver has accepted the ride
            const { data: driver } = await supabase
              .from('driver_details')
              .select('name, phone_number, vehicle_number, vehicle_type')
              .eq('user_id', updatedRide.driver_id)
              .single();

            setCurrentRide({
              ...currentRide,
              ...updatedRide,
              driver: driver
            });

            toast({
              title: 'Driver Found!',
              description: `${driver.name} is on their way to pick you up.`,
              duration: 5000
            });

            // Navigate to ride progress
            navigate('/ride-progress');
          } else if (updatedRide.status === 'cancelled') {
            toast({
              title: 'Ride Cancelled',
              description: updatedRide.cancellation_reason || 'The ride has been cancelled.',
              duration: 5000
            });
            navigate('/');
          }
        }
      )
      .subscribe();

    // Set a timeout to cancel the ride if no driver accepts
    const timeout = setTimeout(() => {
      if (currentRide.status === 'searching') {
        cancelRide(currentRide.id, 'No driver found');
        toast({
          title: 'No Driver Found',
          description: 'Please try requesting again with a higher bid.',
          duration: 5000
        });
        navigate('/');
      }
    }, 300000); // 5 minutes

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [currentRide?.id]);

  const handleCancel = () => {
    if (currentRide?.id) {
      cancelRide(currentRide.id, 'Cancelled by passenger');
    }
    navigate('/');
  };

  if (!currentRide) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md mx-auto mt-8 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-gray-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-medium">Finding</span>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center mb-6">
            Looking for a driver...
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bid Amount</span>
              <span className="font-semibold">RS {userBid}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-blue-500 mt-1" />
                <div>
                  <p className="text-sm font-medium">Pickup</p>
                  <p className="text-sm text-gray-500">{pickupLocation?.name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium">Dropoff</p>
                  <p className="text-sm text-gray-500">{dropoffLocation?.name}</p>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
          >
            Cancel Request
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WaitingDriver; 