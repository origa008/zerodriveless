import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import LocationSearch from '@/components/ride/LocationSearch';
import LocationInput from '@/components/ride/LocationInput';
import RideOptionCard from '@/components/ride/RideOptionCard';
import { Loader2, Clock, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Location, PaymentMethod } from '@/lib/types';

type PaymentMethod = 'cash' | 'wallet';

const PassengerPanel: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
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
    isSearchingRides,
    estimatedDistance,
    estimatedDuration,
    calculateBaseFare,
    userBid,
    setUserBid,
    isWaitingForDriverAcceptance,
    setWaitingForDriverAcceptance,
    driverAcceptanceTimer,
    resetDriverAcceptanceTimer,
    walletBalance,
    isPanelOpen,
    setPanelOpen
  } = useRide();

  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

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

  useEffect(() => {
    if (isWaitingForDriverAcceptance && driverAcceptanceTimer <= 0) {
      setWaitingForDriverAcceptance(false);
      toast({
        title: "No drivers available",
        description: "Please try increasing your bid to find a driver faster.",
        duration: 5000
      });
    }
  }, [isWaitingForDriverAcceptance, driverAcceptanceTimer, setWaitingForDriverAcceptance, toast]);

  const handleFindRides = () => {
    // Check if user has completed their profile
    if (!user?.phone) {
      toast({
        title: "Profile incomplete",
        description: "Please update your phone number and address in your profile",
        duration: 5000
      });
      return;
    }
    
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
    // If payment method is wallet, validate wallet balance
    if (paymentMethod === 'wallet' && walletBalance < (userBid || 0)) {
      toast({
        title: "Insufficient balance",
        description: "Please add money to your wallet or switch to cash payment.",
        duration: 5000
      });
      return;
    }

    // Send ride request to drivers
    confirmRide(paymentMethod);
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
      const currentBid = userBid || minBid;
      
      // Increase by 20%
      const increasedBid = Math.round(currentBid * 1.2);
      setBidAmount(increasedBid);
      setShowBidModal(true);
    }
  };

  const handleTogglePaymentMethod = () => {
    setPaymentMethod(prev => prev === 'cash' ? 'wallet' : 'cash');
  };

  // Render for expanded panel view (after finding rides)
  if (isPanelOpen) {
    return (
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
              <p className="text-sm text-gray-600 mb-3">
                If no driver accepts your bid in the time limit, you may need to increase your bid.
              </p>
              <Button onClick={handleIncreaseBid} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                Increase Bid
              </Button>
            </div>
          </div>
        ) : userBid ? (
          <div className="mb-6">
            <div className="border border-gray-200 rounded-2xl p-4 flex justify-between">
              <div>
                <span className="text-gray-500">Your bid:</span>
                <span className="ml-2 text-xl font-bold">{userBid} RS</span>
              </div>
              <button className="text-blue-500" onClick={() => setShowBidModal(true)}>
                Change
              </button>
            </div>
          </div>
        ) : null}
        
        <div className="mb-6">
          <div className="border border-gray-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-medium">Payment Method</span>
              <button onClick={handleTogglePaymentMethod} className="text-blue-500">
                Change
              </button>
            </div>
            <div className="flex items-center mt-2">
              {paymentMethod === 'cash' ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-green-500 mr-2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <span>Pay by Cash</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-blue-500 mr-2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <span>Pay from Wallet (Balance: RS {walletBalance.toFixed(0)})</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleOrderNow} 
          disabled={!selectedRideOption || !userBid || isWaitingForDriverAcceptance || (paymentMethod === 'wallet' && walletBalance < (userBid || 0))} 
          className="w-full bg-black text-white hover:bg-gray-800 text-xl py-[30px] rounded-2xl my-[10px]"
        >
          {isWaitingForDriverAcceptance ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin mr-2" />
              Waiting for driver...
            </div>
          ) : paymentMethod === 'wallet' && walletBalance < (userBid || 0) ? (
            'Insufficient Balance'
          ) : (
            'Confirm Ride'
          )}
        </Button>
        
        {/* Bid Modal */}
        {showBidModal && estimatedDistance && selectedRideOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-medium mb-4">
                {userBid ? 'Update Your Bid' : 'Place Your Bid'}
              </h3>
              
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
                  onChange={e => setBidAmount(Number(e.target.value))} 
                  className="w-full border border-gray-300 rounded-lg p-3" 
                />
                <p className="text-sm text-gray-500 mt-1">Minimum bid: {calculateBaseFare(estimatedDistance, selectedRideOption.name)} RS</p>
                
                {paymentMethod === 'wallet' && bidAmount > walletBalance && (
                  <p className="text-sm text-red-500 mt-2">Your wallet balance is insufficient for this bid. Please add money to your wallet or switch to cash payment.</p>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBidModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-black text-white" 
                  onClick={handlePlaceBid} 
                  disabled={bidAmount < calculateBaseFare(estimatedDistance, selectedRideOption.name)}
                >
                  {userBid ? 'Update Bid' : 'Place Bid'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Render for collapsed panel view (initial search panel)
  return (
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

      {!user?.phone && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-sm text-gray-700 mb-2">
            Please update your profile with your phone number and address to ensure a smooth ride experience.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full border-yellow-400 text-yellow-700"
            onClick={() => navigate('/profile')}
          >
            Update Profile
          </Button>
        </div>
      )}
    </div>
  );
};

export default PassengerPanel;
