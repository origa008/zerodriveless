
import React, { useEffect, useState } from 'react';
import { useRide } from '@/lib/context/RideContext';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/context/AuthContext';
import { isEligibleDriver } from '@/lib/utils/driverDetailUtils';

interface ModeSwitcherProps {
  isDriverEligible?: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = () => {
  const { isDriverMode, setDriverMode } = useRide();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check driver eligibility when component mounts
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?.id) {
        setIsEligible(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await isEligibleDriver(user.id);
        console.log("Driver eligibility check result:", result);
        setIsEligible(result.eligible);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
        setIsEligible(false);
        setIsLoading(false);
      }
    };

    checkEligibility();
  }, [user]);

  const handleModeSwitch = async () => {
    if (!user?.id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to switch modes.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    const newMode = !isDriverMode;
    
    if (newMode) {
      // User wants to switch to driver mode
      setIsLoading(true);
      
      try {
        const result = await isEligibleDriver(user.id);
        
        if (!result.eligible) {
          toast({
            title: 'Driver Registration Required',
            description: result.reason || 'Please complete the driver registration process.',
            variant: 'default'
          });
          
          // Navigate to the appropriate page based on the issue
          navigate(result.redirectTo || '/official-driver');
          setIsLoading(false);
          return;
        }
        
        // Driver is eligible, switch mode and navigate
        console.log('Switching to driver mode');
        setDriverMode(true);
        navigate('/ride-requests');
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
        toast({
          title: 'Error',
          description: 'Could not verify driver status',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Switch to passenger mode
      console.log('Switching to passenger mode');
      setDriverMode(false);
      navigate('/');
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="flex items-center gap-2">
        <Switch
          checked={isDriverMode}
          onCheckedChange={handleModeSwitch}
          disabled={isLoading}
          className="data-[state=checked]:bg-violet-600"
        />
        <span className="text-sm font-medium">
          {isDriverMode ? 'Driver Mode' : 'Passenger Mode'}
          {isLoading && ' (Loading...)'}
        </span>
      </div>
    </div>
  );
};

export default ModeSwitcher;
