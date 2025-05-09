
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, User } from 'lucide-react';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreateTestRideButton } from '@/components/CreateTestRideButton';

export const DriverModeToggle = () => {
  const { user } = useAuth();
  const { isDriverMode, setDriverMode } = useRide();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleToggle = () => {
    if (isDriverMode) {
      setDriverMode(false);
      toast({
        title: 'Switched to Passenger Mode',
        description: 'You are now in passenger mode.',
      });
    } else {
      navigate('/ride-requests');
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
      {user && (
        <CreateTestRideButton
          variant="default"
          onSuccess={() => {
            toast({
              title: 'Test Ride Created',
              description: 'Check Ride Requests page to see it.',
            });
          }}
        />
      )}
      <Button 
        onClick={handleToggle} 
        className={`rounded-full shadow-lg p-3 flex items-center justify-center ${
          isDriverMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isDriverMode ? (
          <User className="w-5 h-5" />
        ) : (
          <Car className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
};

export default DriverModeToggle;
