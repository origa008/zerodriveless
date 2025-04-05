
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import RideMap from '@/components/map/RideMap';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ModeSwitcher from '@/components/shared/ModeSwitcher';
import DriverMode from '@/components/driver/DriverMode';
import Sidebar from '@/components/layout/Sidebar';
import PassengerPanel from '@/components/ride/PassengerPanel';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { isDriverMode, setDriverMode } = useRide();
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [showDriverRegistrationPrompt, setShowDriverRegistrationPrompt] = useState(false);
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

  // Effect to handle driver mode switch for unregistered users
  useEffect(() => {
    if (isDriverMode && user && !user.isVerifiedDriver) {
      setShowDriverRegistrationPrompt(true);
    } else {
      setShowDriverRegistrationPrompt(false);
    }
  }, [isDriverMode, user]);

  // Handle toggle between passenger and driver modes
  const handleModeToggle = (isDriver: boolean) => {
    if (isDriver && user && !user.isVerifiedDriver) {
      setShowDriverRegistrationPrompt(true);
    }
    setDriverMode(isDriver);
  };

  // Navigate to driver registration page
  const handleRegisterAsDriver = () => {
    navigate('/official-driver');
  };

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

  console.log("Rendering main Index content for user:", user.name);
  
  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <RideMap />
        <ModeSwitcher />
        <Sidebar />
      </div>
      
      {showDriverRegistrationPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-2">Driver Registration Required</h3>
            <p className="text-gray-600 mb-4">
              You need to register as an official driver before you can start accepting rides.
            </p>
            <div className="flex space-x-3">
              <button 
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg" 
                onClick={() => {
                  setShowDriverRegistrationPrompt(false);
                  setDriverMode(false);
                }}
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-2 px-4 bg-black text-white rounded-lg" 
                onClick={handleRegisterAsDriver}
              >
                Register Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isDriverMode ? (
        <DriverMode isOnline={isDriverOnline} setIsOnline={setIsDriverOnline} />
      ) : (
        <PassengerPanel />
      )}
      
      <BottomNavigation />
    </div>
  );
};

export default Index;
