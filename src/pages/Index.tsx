
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserProfile } from '@/lib/utils/profileUtils';
import { useRide } from '@/lib/context/RideContext';
import { Button } from '@/components/ui/button';
import { Car } from 'lucide-react';
import RideMap from '@/components/map/RideMap';
import BottomNavigation from '@/components/layout/BottomNavigation';
import Sidebar from '@/components/layout/Sidebar';
import PassengerPanel from '@/components/ride/PassengerPanel';
import { useToast } from '@/hooks/use-toast';
import { isEligibleDriver } from '@/lib/utils/driverUtils';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, setUser } = useAuth();
  const { isDriverMode, setDriverMode } = useRide();
  const [pageLoaded, setPageLoaded] = useState(false);
  const [initComplete, setInitComplete] = useState(false);
  const [isEligible, setIsEligible] = useState(false);

  // Debug logs for authentication state
  useEffect(() => {
    console.log("Index page - Auth state:", {
      user: user?.name,
      email: user?.email,
      isLoggedIn: user?.isLoggedIn,
      authLoading,
      initComplete
    });
  }, [user, authLoading, initComplete]);

  // Effect to manage page loaded state
  useEffect(() => {
    // Set loaded after a brief delay
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Check if user is eligible to be a driver
  useEffect(() => {
    const checkDriverEligibility = async () => {
      if (user?.id) {
        try {
          const eligible = await isEligibleDriver(user.id);
          console.log("Driver eligibility check:", eligible);
          setIsEligible(eligible);
        } catch (error) {
          console.error("Error checking driver eligibility:", error);
          setIsEligible(false);
        }
      }
    };
    
    checkDriverEligibility();
  }, [user?.id]);

  // Wait for auth to initialize and handle authentication flow
  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading) {
        try {
          // Check if user is logged in
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // User is logged in, fetch their profile
            const { profile, error } = await fetchUserProfile(session.user.id);
            
            if (profile) {
              setUser({ ...profile, isLoggedIn: true });
              console.log("User authenticated and profile loaded");
              setInitComplete(true);
            } else if (error) {
              console.error("Error fetching profile:", error);
              navigate('/welcome');
            }
          } else {
            // No session, redirect to welcome page
            console.log("No active session, redirecting to welcome");
            navigate('/welcome');
          }
        } catch (error) {
          console.error("Error checking authentication:", error);
          navigate('/welcome');
        }
      }
    };

    checkAuth();
  }, [authLoading, navigate, setUser]);

  // Show loading state during initial auth check and page load
  if (authLoading || !pageLoaded || !initComplete) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 animate-pulse">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Checking your account...</p>
        <p className="text-gray-400 text-sm mt-1">{authLoading ? "Authenticating..." : "Loading app..."}</p>
      </div>
    );
  }

  // If we get here but user is not logged in (can happen during state transitions), redirect to welcome
  if (!user?.isLoggedIn) {
    console.log("User authenticated check failed in render phase, redirecting");
    navigate('/welcome');
    return null;
  }
  
  const handleSwitchToDriver = () => {
    if (isEligible) {
      navigate('/ride-requests');
    } else {
      toast({
        title: "Driver Registration Required",
        description: "You need to register as a driver before accessing this feature.",
        variant: "default"
      });
      navigate('/official-driver');
    }
  };
  
  console.log("Rendering main Index content for user:", user.name);
  return <div className="min-h-screen bg-white">
      <div className="relative">
        <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleSwitchToDriver}
          >
            <Car className="h-4 w-4" />
            Switch to Driver
          </Button>
        </div>
        <RideMap />
        <Sidebar />
      </div>
      
      <PassengerPanel />
      
      <BottomNavigation />
    </div>;
};

export default Index;
