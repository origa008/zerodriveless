
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import LocationSearch from '@/components/ride/LocationSearch';
import RideMap from '@/components/map/RideMap';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ModeSwitcher from '@/components/shared/ModeSwitcher';
import DriverMode from '@/components/driver/DriverMode';
import Sidebar from '@/components/layout/Sidebar';
import ContactModal from '@/components/ride/ContactModal';
import UserOnboarding from '@/components/onboarding/UserOnboarding';
import AppGuidelines from '@/components/onboarding/AppGuidelines';
import DriverRegistration from '@/components/driver/DriverRegistration';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, driverRegistrationStatus, setDriverRegistrationStatus } = useAuth();
  const {
    pickupLocation,
    dropoffLocation,
    handlePickupSelect,
    handleDropoffSelect,
    findRides,
    isPanelOpen,
    setPanelOpen,
    isDriverMode,
    setDriverMode,
    isSearchingRides,
    handlePickupChange,
    handleDropoffChange
  } = useRide();
  
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAppGuidelines, setShowAppGuidelines] = useState(false);
  const [showDriverRegistration, setShowDriverRegistration] = useState(false);

  // Check if user needs to complete onboarding profile or see app guidelines
  useEffect(() => {
    const hasSeenGuidelines = localStorage.getItem('hasSeenGuidelines');
    if (!hasSeenGuidelines) {
      setShowAppGuidelines(true);
    }
  }, []);

  // If driver mode is enabled but user is not registered as driver, show registration
  useEffect(() => {
    if (isDriverMode && driverRegistrationStatus === 'not_started') {
      setShowDriverRegistration(true);
    }
  }, [isDriverMode, driverRegistrationStatus]);

  useEffect(() => {
    if (!isLoading && !user?.isLoggedIn) {
      navigate('/welcome');
    }
  }, [user, isLoading, navigate]);

  const handleDriverModeToggle = (isDriver: boolean) => {
    setDriverMode(isDriver);
    if (isDriver && driverRegistrationStatus === 'not_started') {
      setShowDriverRegistration(true);
    }
  };

  const handleCompleteDriverRegistration = () => {
    setShowDriverRegistration(false);
    setDriverRegistrationStatus('pending_review');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (isDriverMode) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative">
          <RideMap />
          <ModeSwitcher onToggle={handleDriverModeToggle} />
          <Sidebar />
        </div>
        
        <DriverMode isOnline={isDriverOnline} setIsOnline={setIsDriverOnline} />
        
        {showDriverRegistration && (
          <DriverRegistration 
            onClose={() => {
              setShowDriverRegistration(false);
              setDriverMode(false);
            }}
            onComplete={handleCompleteDriverRegistration}
          />
        )}
        
        {showContactModal && (
          <ContactModal onClose={() => setShowContactModal(false)} role="driver" />
        )}
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <RideMap />
        <ModeSwitcher onToggle={handleDriverModeToggle} />
        <Sidebar />
      </div>
      
      {isPanelOpen ? (
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
          <div className="mb-4">
            <LocationInput label="Pickup" value={pickupLocation?.name || ''} onChange={handlePickupChange} placeholder="Choose pickup location" readOnly />
            <LocationInput label="Dropoff" value={dropoffLocation?.name || ''} onChange={handleDropoffChange} placeholder="Choose drop location" readOnly />
          </div>
          
          {/* The rest of the passenger panel functionality is now in PassengerPanel component */}
          <PassengerPanel />
        </div>
      ) : (
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 py-[24px] my-[50px]">
          <div className="mb-6">
            <LocationSearch 
              label="Pickup" 
              value={pickupLocation?.name || ''} 
              onChange={handlePickupChange} 
              onSelect={handlePickupSelect} 
              placeholder="Choose pickup location" 
            />
            <LocationSearch 
              label="Dropoff" 
              value={dropoffLocation?.name || ''} 
              onChange={handleDropoffChange} 
              onSelect={handleDropoffSelect} 
              placeholder="Choose drop location" 
            />
          </div>
          
          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl" 
            onClick={findRides} 
            disabled={!pickupLocation || !dropoffLocation || isSearchingRides}
          >
            {isSearchingRides ? (
              <>
                <Loader2 className="animate-spin mr-2" />
                Finding rides...
              </>
            ) : (
              'Find rides'
            )}
          </Button>
        </div>
      )}
      
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} role="passenger" />
      )}
      
      {/* Onboarding for new users */}
      <UserOnboarding />
      
      {/* App guidelines popup */}
      {showAppGuidelines && (
        <AppGuidelines onClose={() => setShowAppGuidelines(false)} />
      )}
      
      <BottomNavigation />
    </div>
  );
};

import { Loader2 } from 'lucide-react';
import LocationInput from '@/components/ride/LocationInput';
import PassengerPanel from '@/components/ride/PassengerPanel';

export default Index;
