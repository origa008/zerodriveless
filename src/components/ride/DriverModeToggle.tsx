
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, User } from 'lucide-react';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { CreateTestRideButton } from '@/components/CreateTestRideButton';
import { isEligibleDriver } from '@/lib/utils/driverDetailUtils';

export const DriverModeToggle = () => {
  const { user } = useAuth();
  const { isDriverMode, setDriverMode } = useRide();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEligible, setIsEligible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check driver eligibility
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?.id) return;
      
      try {
        const result = await isEligibleDriver(user.id);
        setIsEligible(result.eligible);
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
      }
    };
    
    checkEligibility();
  }, [user]);

  const handleToggle = async () => {
    if (isDriverMode) {
      setDriverMode(false);
      toast({
        title: 'Switched to Passenger Mode',
        description: 'You are now in passenger mode.',
      });
    } else {
      // Check eligibility before navigating to driver mode
      if (!user?.id) {
        toast({
          title: 'Login Required',
          description: 'Please log in to switch to driver mode.',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }
      
      setIsChecking(true);
      try {
        const result = await isEligibleDriver(user.id);
        
        if (result.eligible) {
          navigate('/ride-requests');
        } else {
          toast({
            title: 'Driver Registration Required',
            description: result.reason || 'Please complete your driver registration first.',
            variant: 'default'
          });
          navigate(result.redirectTo || '/official-driver');
        }
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
        toast({
          title: 'Error',
          description: 'Could not verify driver status',
          variant: 'destructive'
        });
      } finally {
        setIsChecking(false);
      }
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
        disabled={isChecking}
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
