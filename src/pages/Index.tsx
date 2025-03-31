
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import LocationSearch from '@/components/ride/LocationSearch';
import LocationInput from '@/components/ride/LocationInput';
import RideMap from '@/components/map/RideMap';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ModeSwitcher from '@/components/shared/ModeSwitcher';
import RideOptionCard from '@/components/ride/RideOptionCard';
import { Location } from '@/lib/types';
import { Grid, Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const {
    pickupLocation,
    dropoffLocation,
    setPickupLocation,
    setDropoffLocation,
    availableRideOptions,
    findRides,
    selectedRideOption,
    setSelectedRideOption,
    confirmRide,
    isPanelOpen,
    setPanelOpen,
    isDriverMode,
    isSearchingRides,
    estimatedDistance,
    estimatedDuration
  } = useRide();

  useEffect(() => {
    // Redirect to welcome if not logged in
    if (!isLoading && !user?.isLoggedIn) {
      navigate('/welcome');
    }
  }, [user, isLoading, navigate]);

  // Handle input changes
  const handlePickupChange = (value: string) => {
    // Just update the input value, but don't set the location yet
  };

  const handleDropoffChange = (value: string) => {
    // Just update the input value, but don't set the location yet
  };

  // Handle location selection
  const handlePickupSelect = (location: Location) => {
    setPickupLocation(location);
  };

  const handleDropoffSelect = (location: Location) => {
    setDropoffLocation(location);
  };

  const handleFindRides = () => {
    findRides();
  };

  const handleSelectRideOption = (option: any) => {
    setSelectedRideOption(option);
  };

  const handleOrderNow = () => {
    confirmRide();
    navigate('/ride-progress');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isDriverMode) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative">
          <RideMap />
          <ModeSwitcher />
          
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-white p-3 rounded-full shadow-md">
              <Grid size={24} />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-2xl font-medium mb-4">Driver Mode</h2>
          <p className="text-gray-600 mb-6">You are currently in driver mode. No ride requests at the moment.</p>
          
          <Button className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl">
            Go Online
          </Button>
        </div>
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <RideMap />
        <ModeSwitcher />
        
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-white p-3 rounded-full shadow-md">
            <Grid size={24} />
          </div>
        </div>
      </div>
      
      {isPanelOpen ? (
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
          <div className="mb-4">
            <LocationInput 
              label="Pickup" 
              value={pickupLocation?.name || ''} 
              onChange={handlePickupChange} 
              placeholder="Choose pickup location" 
              readOnly 
            />
            <LocationInput 
              label="Dropoff" 
              value={dropoffLocation?.name || ''} 
              onChange={handleDropoffChange} 
              placeholder="Choose drop location" 
              readOnly 
            />
          </div>
          
          {estimatedDistance && estimatedDuration && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-gray-600">Estimated Trip: {estimatedDistance} km • {estimatedDuration} min</p>
            </div>
          )}
          
          <div className="mb-4">
            <h3 className="text-xl font-medium mb-2 px-[8px]">Choose Vehicle</h3>
            {availableRideOptions.map(option => (
              <RideOptionCard 
                key={option.id} 
                option={option} 
                isSelected={selectedRideOption?.id === option.id} 
                onSelect={handleSelectRideOption} 
              />
            ))}
          </div>
          
          <div className="mb-6">
            <div className="border border-gray-200 rounded-2xl p-4 flex justify-between">
              <button className="text-xl">Cash Payment</button>
              <button className="text-xl text-gray-500">Change</button>
            </div>
          </div>
          
          <Button 
            onClick={handleOrderNow} 
            disabled={!selectedRideOption} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl py-[30px] rounded-2xl my-[10px]"
          >
            Order now
          </Button>
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
            onClick={handleFindRides} 
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
      
      <BottomNavigation />
    </div>
  );
};

export default Index;
