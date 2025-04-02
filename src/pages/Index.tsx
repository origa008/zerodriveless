
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

const Index: React.FC = () => {
  console.log("Rendering Index component");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Log before accessing useAuth to debug context issues
  console.log("About to access useAuth in Index component");
  const { user, isLoading } = useAuth();
  console.log("useAuth accessed successfully", { user, isLoading });
  
  const { isDriverMode, setDriverMode } = useRide();
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [showDriverRegistrationPrompt, setShowDriverRegistrationPrompt] = useState(false);
  
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
      // If user tries to switch to driver mode but isn't verified
      setShowDriverRegistrationPrompt(true);
    }
    setDriverMode(isDriver);
  };
  
  // Navigate to driver registration page
  const handleRegisterAsDriver = () => {
    navigate('/official-driver');
  };
  
  // Redirect to Welcome for unauthenticated users
  useEffect(() => {
    console.log("Index auth check effect running", { user, isLoading });
    if (!isLoading && !user?.isLoggedIn) {
      console.log("Redirecting to welcome page - user not logged in");
      navigate('/welcome');
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
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
