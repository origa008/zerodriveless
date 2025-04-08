
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import RideMap from '@/components/map/RideMap';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ModeSwitcher from '@/components/shared/ModeSwitcher';
import Sidebar from '@/components/layout/Sidebar';
import PassengerPanel from '@/components/ride/PassengerPanel';
import { useToast } from '@/hooks/use-toast';
import { isEligibleDriver } from '@/lib/utils/driverUtils';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { isDriverMode, setDriverMode } = useRide();
  
  const [isDriverEligible, setIsDriverEligible] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [initComplete, setInitComplete] = useState(false);

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
      if (!user?.id) return;
      
      try {
        const eligible = await isEligibleDriver(user.id);
        console.log("Driver eligibility check:", eligible);
        setIsDriverEligible(eligible);
        
        // If user is in driver mode, redirect to ride requests
        if (isDriverMode) {
          navigate('/ride-requests');
        }
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
      }
    };
    
    if (user?.id) {
      checkDriverEligibility();
    }
  }, [user?.id, isDriverMode, navigate]);

  // Wait for auth to initialize, then check login status
  useEffect(() => {
    if (!authLoading) {
      if (!user?.isLoggedIn) {
        console.log("User not authenticated, redirecting to welcome");
        navigate('/welcome');
      } else {
        console.log("Auth initialization complete, user authenticated");
        setInitComplete(true);
      }
    }
  }, [user, authLoading, navigate]);

  // Show loading state during initial auth check and page load
  if (authLoading || !pageLoaded || !initComplete) {
    return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 animate-pulse">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Checking your account...</p>
        <p className="text-gray-400 text-sm mt-1">{authLoading ? "Authenticating..." : "Loading app..."}</p>
      </div>;
  }

  // If we get here but user is not logged in (can happen during state transitions), redirect to welcome
  if (!user?.isLoggedIn) {
    console.log("User authenticated check failed in render phase, redirecting");
    navigate('/welcome');
    return null;
  }
  
  console.log("Rendering main Index content for user:", user.name);
  return <div className="min-h-screen bg-white">
      <div className="relative">
        <RideMap />
        <ModeSwitcher isDriverEligible={isDriverEligible} />
        <Sidebar />
      </div>
      
      <PassengerPanel />
      
      <BottomNavigation />
    </div>;
};

export default Index;
