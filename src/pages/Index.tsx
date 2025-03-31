
import React, { useEffect, useState } from 'react';
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
import DriverMode from '@/components/driver/DriverMode';
import Sidebar from '@/components/layout/Sidebar';
import { Location } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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
  
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(0);

  useEffect(() => {
    if (!isLoading && !user?.isLoggedIn) {
      navigate('/welcome');
    }
  }, [user, isLoading, navigate]);

  const handlePickupChange = (value: string) => {
  };

  const handleDropoffChange = (value: string) => {
  };

  const handlePickupSelect = (location: Location) => {
    setPickupLocation(location);
  };

  const handleDropoffSelect = (location: Location) => {
    setDropoffLocation(location);
  };

  const handleFindRides = () => {
    findRides();
    setShowBidModal(true);
  };

  const handleSelectRideOption = (option: any) => {
    setSelectedRideOption(option);
  };

  const handleOrderNow = () => {
    confirmRide();
    navigate('/ride-progress');
  };

  const handlePlaceBid = () => {
    setShowBidModal(false);
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
          <Sidebar />
        </div>
        
        <DriverMode isOnline={isDriverOnline} setIsOnline={setIsDriverOnline} />
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <RideMap />
        <ModeSwitcher />
        <Sidebar />
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

      {/* Bid Modal for Passenger */}
      {showBidModal && estimatedDistance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Place Your Bid</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">Route: {pickupLocation?.name} → {dropoffLocation?.name}</p>
              <p className="text-gray-600 mb-2">Distance: {estimatedDistance} km</p>
              <p className="text-gray-600 mb-2">Base fare: {Math.round(estimatedDistance * 9)} RS</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Your Bid (RS)</label>
              <input
                type="number"
                min={Math.round(estimatedDistance * 9)}
                value={bidAmount || Math.round(estimatedDistance * 9)}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3"
              />
              <p className="text-sm text-gray-500 mt-1">Minimum bid: {Math.round(estimatedDistance * 9)} RS</p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowBidModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-black text-white"
                onClick={handlePlaceBid}
              >
                Place Bid
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </div>
  );
};

export default Index;
