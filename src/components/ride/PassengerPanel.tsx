
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LocationSearch from './LocationSearch';
import RideOptionCard from './RideOptionCard';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { Check, CreditCard, Loader2, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createRideRequest } from '@/lib/utils/rideUtils';

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
    isSearchingRides,
    estimatedDistance,
    estimatedDuration,
    calculateBaseFare,
    userBid,
    setUserBid,
    isPanelOpen,
    setPanelOpen,
    walletBalance
  } = useRide();

  const [step, setStep] = useState<'locations' | 'options' | 'confirm'>('locations');
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [hasSufficientBalance, setHasSufficientBalance] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);

  // Effect to trigger ride finding when locations are set
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      setStep('options');
      findRides();
    }
  }, [pickupLocation, dropoffLocation, findRides]);

  // Check if user has sufficient balance for wallet payment
  useEffect(() => {
    if (selectedPayment === 'wallet' && userBid) {
      setHasSufficientBalance(walletBalance >= userBid);
    }
  }, [selectedPayment, userBid, walletBalance]);

  // Handle ride option selection
  const handleSelectOption = (option: any) => {
    setSelectedRideOption(option);
    
    if (estimatedDistance) {
      const baseFare = calculateBaseFare(estimatedDistance, option.name);
      setUserBid(baseFare);
    }
    
    setStep('confirm');
  };

  // Handle bid change
  const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setUserBid(value);
    }
  };

  // Handle ride confirmation
  const handleConfirmRide = async () => {
    if (!user?.id || !pickupLocation || !dropoffLocation || !selectedRideOption || !userBid) {
      toast({
        title: "Error",
        description: "Missing required information to create ride request",
        duration: 3000
      });
      return;
    }
    
    if (selectedPayment === 'wallet' && !hasSufficientBalance) {
      toast({
        title: "Insufficient balance",
        description: "Please add funds to your wallet or choose cash payment",
        duration: 3000
      });
      return;
    }
    
    setIsCreatingRide(true);
    
    try {
      console.log("Creating ride request with:", {
        userId: user.id,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        option: selectedRideOption,
        price: userBid,
        distance: estimatedDistance || 0,
        duration: estimatedDuration || 0,
        payment: selectedPayment
      });
      
      const { rideId, error } = await createRideRequest(
        user.id,
        pickupLocation,
        dropoffLocation,
        selectedRideOption,
        userBid,
        estimatedDistance || 0,
        estimatedDuration || 0,
        selectedPayment
      );
      
      if (error) {
        throw new Error(error);
      }
      
      console.log("Ride request created with ID:", rideId);
      
      toast({
        title: "Ride request created",
        description: "Looking for drivers nearby...",
        duration: 3000
      });
      
      // Set waiting state while looking for drivers
      setIsWaiting(true);
      setPanelOpen(false);
      
      // TODO: Here we'd ideally subscribe to changes on this ride to know when a driver accepts it
      // For now, we'll just wait a bit and then reset
      setTimeout(() => {
        setIsWaiting(false);
        setStep('locations');
        setPickupLocation(null);
        setDropoffLocation(null);
        setSelectedRideOption(null);
        setUserBid(null);
      }, 60000); // Give it 60 seconds to find a driver
      
    } catch (error: any) {
      console.error('Error creating ride:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create ride request",
        duration: 3000
      });
    } finally {
      setIsCreatingRide(false);
    }
  };

  // Render the correct step
  const renderStep = () => {
    switch (step) {
      case 'locations':
        return (
          <div className="space-y-4 py-2">
            <LocationSearch 
              label="Pickup Location"
              placeholder="Current Location"
              value={pickupLocation ? pickupLocation.name : ""}
              onChange={(value) => {}}
              onSelect={setPickupLocation}
              icon={undefined}
            />
            <LocationSearch 
              label="Dropoff Location"
              placeholder="Where to?"
              value={dropoffLocation ? dropoffLocation.name : ""}
              onChange={(value) => {}}
              onSelect={setDropoffLocation}
              icon={undefined}
            />
          </div>
        );
      
      case 'options':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">Select Ride Option</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setStep('locations');
                  setSelectedRideOption(null);
                }}
              >
                Change Location
              </Button>
            </div>
            
            {isSearchingRides ? (
              <div className="py-8 flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
                <p className="text-gray-600">Finding available rides...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableRideOptions.map((option) => (
                  <RideOptionCard
                    key={option.id}
                    option={option}
                    distance={estimatedDistance || 0}
                    duration={estimatedDuration || 0}
                    onSelect={() => handleSelectOption(option)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      
      case 'confirm':
        if (!selectedRideOption || !userBid) return null;
        
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">Confirm Your Ride</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setStep('options')}
              >
                Change Vehicle
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-3">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">{estimatedDistance?.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-gray-600">Est. Duration:</span>
                <span className="font-medium">{Math.round((estimatedDuration || 0) / 60)} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle:</span>
                <span className="font-medium">{selectedRideOption.name}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Your Bid (Rs)</label>
              <input
                type="number"
                min={Math.round(calculateBaseFare(estimatedDistance || 0, selectedRideOption.name) * 0.8)}
                value={userBid}
                onChange={handleBidChange}
                className="w-full border border-gray-300 rounded-lg p-3"
              />
              <p className="text-xs text-gray-500 mt-1">Min bid: Rs {Math.round(calculateBaseFare(estimatedDistance || 0, selectedRideOption.name) * 0.8)}</p>
            </div>
            
            <div>
              <p className="block text-sm font-medium mb-2">Payment Method</p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayment('cash')}
                  className={cn(
                    "flex-1 border rounded-lg p-3 flex items-center justify-center",
                    selectedPayment === 'cash' 
                      ? "border-primary bg-primary/10" 
                      : "border-gray-300"
                  )}
                >
                  <CreditCard className={cn(
                    "mr-2 h-5 w-5",
                    selectedPayment === 'cash' ? "text-primary" : "text-gray-500"
                  )} />
                  Cash
                  {selectedPayment === 'cash' && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayment('wallet')}
                  className={cn(
                    "flex-1 border rounded-lg p-3 flex items-center justify-center",
                    selectedPayment === 'wallet' 
                      ? "border-primary bg-primary/10" 
                      : "border-gray-300"
                  )}
                >
                  <WalletCards className={cn(
                    "mr-2 h-5 w-5",
                    selectedPayment === 'wallet' ? "text-primary" : "text-gray-500"
                  )} />
                  Wallet
                  {selectedPayment === 'wallet' && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </button>
              </div>
              <div className="text-sm mt-1">
                {selectedPayment === 'wallet' && (
                  <p className={cn(
                    hasSufficientBalance ? "text-green-600" : "text-red-600"
                  )}>
                    Balance: Rs {walletBalance} {!hasSufficientBalance && '(Insufficient)'}
                  </p>
                )}
              </div>
            </div>
            
            <Button 
              className="w-full bg-black text-white"
              onClick={handleConfirmRide}
              disabled={isCreatingRide || (selectedPayment === 'wallet' && !hasSufficientBalance)}
            >
              {isCreatingRide ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Ride"
              )}
            </Button>
          </div>
        );
    }
  };

  if (isWaiting) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg">
        <div className="py-4 flex flex-col items-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Looking for drivers</h3>
            <p className="text-gray-600 text-center">Please wait while we find drivers near you.</p>
            <p className="text-gray-500 text-center text-sm mt-2">This could take a few moments...</p>
          </div>
          
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => {
              setIsWaiting(false);
              setStep('locations');
              setPickupLocation(null);
              setDropoffLocation(null);
              setSelectedRideOption(null);
              setUserBid(null);
              setPanelOpen(true);
            }}
          >
            Cancel Request
          </Button>
        </div>
      </div>
    );
  }

  if (!isPanelOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
        <Button 
          className="w-full bg-black text-white" 
          onClick={() => setPanelOpen(true)}
        >
          Where To?
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg">
      {renderStep()}
    </div>
  );
};

export default PassengerPanel;
