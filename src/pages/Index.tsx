
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
import { Loader2, Clock, AlertCircle, PhoneCall, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    estimatedDuration,
    calculateBaseFare,
    userBid,
    setUserBid,
    isWaitingForDriverAcceptance,
    setWaitingForDriverAcceptance,
    driverAcceptanceTimer,
    resetDriverAcceptanceTimer
  } = useRide();
  
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !user?.isLoggedIn) {
      navigate('/welcome');
    }
  }, [user, isLoading, navigate]);

  const handlePickupChange = (value: string) => {
    // just a placeholder
  };

  const handleDropoffChange = (value: string) => {
    // just a placeholder
  };

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
    
    // Once vehicle is selected, immediately show bid modal
    if (estimatedDistance) {
      const minBid = calculateBaseFare(estimatedDistance, option.name);
      setBidAmount(minBid);
      setShowBidModal(true);
    }
  };

  const handleOrderNow = () => {
    // Start the driver acceptance timer when passenger places order
    setWaitingForDriverAcceptance(true);
    resetDriverAcceptanceTimer();
    toast({
      title: "Looking for drivers",
      description: "Waiting for a driver to accept your bid. This will take about a minute.",
      duration: 5000
    });
  };

  const handlePlaceBid = () => {
    setUserBid(bidAmount);
    setShowBidModal(false);
  };

  const handleIncreaseBid = () => {
    if (selectedRideOption && estimatedDistance) {
      const minBid = calculateBaseFare(estimatedDistance, selectedRideOption.name);
      setBidAmount(Math.round(minBid * 1.1)); // Increase by 10%
      setShowBidModal(true);
    }
  };

  const handleContactDriver = () => {
    setShowContactModal(true);
  };

  const handleCall = () => {
    toast({
      title: "Calling...",
      description: "Connecting you to the driver",
      duration: 3000
    });
    setShowContactModal(false);
  };
  
  const handleMessage = () => {
    toast({
      title: "Message sent",
      description: "Your message has been sent to the driver",
      duration: 3000
    });
    setShowContactModal(false);
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
          
          {isWaitingForDriverAcceptance ? (
            <div className="mb-6">
              <div className="border border-yellow-200 bg-yellow-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Clock className="text-yellow-500 mr-2" size={20} />
                    <span className="font-medium">Waiting for driver</span>
                  </div>
                  <span className="font-bold">{driverAcceptanceTimer}s</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">If no driver accepts your bid in the time limit, you may need to increase your bid.</p>
                <Button 
                  onClick={handleIncreaseBid}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Increase Bid
                </Button>
              </div>
            </div>
          ) : (
            userBid && (
              <div className="mb-6">
                <div className="border border-gray-200 rounded-2xl p-4 flex justify-between">
                  <div>
                    <span className="text-gray-500">Your bid:</span>
                    <span className="ml-2 text-xl font-bold">{userBid} RS</span>
                  </div>
                  <button 
                    className="text-blue-500"
                    onClick={() => setShowBidModal(true)}
                  >
                    Change
                  </button>
                </div>
              </div>
            )
          )}
          
          <div className="mb-6">
            <div className="border border-gray-200 rounded-2xl p-4 flex justify-between">
              <button className="text-xl">Cash Payment</button>
              <button className="text-xl text-gray-500">Change</button>
            </div>
          </div>
          
          <Button 
            onClick={handleOrderNow} 
            disabled={!selectedRideOption || !userBid || isWaitingForDriverAcceptance} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl py-[30px] rounded-2xl my-[10px]"
          >
            {isWaitingForDriverAcceptance ? (
              <div className="flex items-center">
                <Loader2 className="animate-spin mr-2" />
                Waiting for driver...
              </div>
            ) : (
              'Confirm Ride'
            )}
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
      {showBidModal && estimatedDistance && selectedRideOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Place Your Bid</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">Route: {pickupLocation?.name} → {dropoffLocation?.name}</p>
              <p className="text-gray-600 mb-2">Distance: {estimatedDistance} km</p>
              <p className="text-gray-600 mb-2">Vehicle: {selectedRideOption.name}</p>
              <p className="text-gray-600 mb-2">Base fare: {calculateBaseFare(estimatedDistance, selectedRideOption.name)} RS</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Your Bid (RS)</label>
              <input
                type="number"
                min={calculateBaseFare(estimatedDistance, selectedRideOption.name)}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3"
              />
              <p className="text-sm text-gray-500 mt-1">Minimum bid: {calculateBaseFare(estimatedDistance, selectedRideOption.name)} RS</p>
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
                disabled={bidAmount < calculateBaseFare(estimatedDistance, selectedRideOption.name)}
              >
                Place Bid
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Contact Driver</h3>
            
            <div className="flex justify-center space-x-6 my-4">
              <button 
                onClick={handleCall}
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-full w-24 h-24"
              >
                <PhoneCall size={32} className="text-green-500 mb-2" />
                <span>Call</span>
              </button>
              
              <button
                onClick={handleMessage}
                className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-full w-24 h-24"
              >
                <MessageSquare size={32} className="text-blue-500 mb-2" />
                <span>Message</span>
              </button>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowContactModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </div>
  );
};

export default Index;
