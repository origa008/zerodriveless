
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Loader2, RefreshCw, Power, AlertTriangle } from 'lucide-react';
import { useRealTimeDriverLocation } from '@/hooks/useRealTimeDriverLocation';
import { useRealTimeRideRequests } from '@/hooks/useRealTimeRideRequests';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { DriverLocationStatus } from '@/components/DriverLocationStatus';
import { RideRequestItem } from '@/components/RideRequestItem';
import { CreateTestRideButton } from '@/components/CreateTestRideButton';
import { RideRequest } from '@/lib/types';
import { extractCoordinates, extractLocationName } from '@/lib/utils/locationUtils';

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setCurrentRide, setDriverMode } = useRide();
  const driverStatus = useDriverStatus(user?.id);
  
  // State for online/offline toggle
  const [isOnline, setIsOnline] = useState(true);
  
  // Initialize location tracking
  const {
    coordinates,
    isTracking,
    error: locationError,
    lastUpdateTime,
    startTracking,
    stopTracking
  } = useRealTimeDriverLocation(5000); // Update every 5 seconds
  
  // Check if driver is eligible
  const isEligible = driverStatus.isApproved && driverStatus.hasSufficientDeposit;
  
  // Load ride requests with real-time updates
  const {
    rides: rideRequests,
    loading: loadingRides,
    error: ridesError,
    acceptRide,
    acceptingRide,
    fetchRideRequests
  } = useRealTimeRideRequests({
    driverId: user?.id,
    coordinates,
    isEligible,
    maxDistance: 15, // km
    autoSubscribe: isOnline
  });
  
  // Start/Stop location tracking based on online status
  useEffect(() => {
    if (isOnline) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [isOnline, startTracking, stopTracking]);
  
  // Set driver mode based on eligibility
  useEffect(() => {
    setDriverMode(isEligible);
  }, [isEligible, setDriverMode]);
  
  // Debug logging
  useEffect(() => {
    console.log("Driver status:", { isEligible, driverStatus });
    console.log("Current coordinates:", coordinates);
    console.log("Current user ID:", user?.id);
    console.log("Ride requests:", rideRequests);
  }, [isEligible, driverStatus, coordinates, rideRequests, user?.id]);
  
  // Handle going online/offline
  const toggleOnlineStatus = () => {
    if (isOnline) {
      stopTracking();
      setIsOnline(false);
      toast({
        title: "You're now offline",
        description: "You won't receive new ride requests.",
      });
    } else {
      setIsOnline(true);
      startTracking();
      toast({
        title: "You're now online",
        description: "You'll start receiving ride requests.",
      });
    }
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (!isOnline) {
      toast({
        title: "Go online first",
        description: "You need to be online to refresh ride requests."
      });
      return;
    }
    
    fetchRideRequests();
    toast({
      title: "Refreshing",
      description: "Looking for new ride requests..."
    });
  };
  
  // Handle creating test ride
  const handleTestRideCreated = () => {
    fetchRideRequests();
  };
  
  // Update the handleAcceptRide function to ensure it works properly
  const handleAcceptRide = async (ride: RideRequest) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You need to be logged in to accept rides",
        variant: "destructive"
      });
      return;
    }
    
    const acceptedRide = await acceptRide(ride);
    if (!acceptedRide) return;
    
    // Extract location details for the ride context
    const pickupCoords = extractCoordinates(acceptedRide.pickup_location);
    const dropoffCoords = extractCoordinates(acceptedRide.dropoff_location);
    
    // Create ride object for context
    const currentRide = {
      id: acceptedRide.id,
      pickup: {
        name: extractLocationName(acceptedRide.pickup_location),
        coordinates: pickupCoords || [0, 0] as [number, number]
      },
      dropoff: {
        name: extractLocationName(acceptedRide.dropoff_location),
        coordinates: dropoffCoords || [0, 0] as [number, number]
      },
      rideOption: {
        id: '1',
        name: 'Standard',
        type: 'car',
        basePrice: acceptedRide.price || 0
      },
      price: acceptedRide.price || 0,
      distance: acceptedRide.distance || 0,
      duration: acceptedRide.duration || 0,
      status: 'confirmed' as const,
      paymentMethod: (acceptedRide.payment_method as 'cash' | 'wallet') || 'cash',
      currency: acceptedRide.currency || 'RS',
      passenger: acceptedRide.passenger
    };
    
    // Set as current ride and navigate
    setCurrentRide(currentRide);
    navigate('/ride-progress');
  };
  
  // Render content based on driver status
  const renderContent = () => {
    if (driverStatus.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-center text-gray-600">Checking your driver status...</p>
        </div>
      );
    }
    
    // Not registered as driver
    if (!driverStatus.isRegistered) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Register as a Driver</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You need to register as a driver to access this feature. Complete the driver registration process to continue.
          </p>
          <Button 
            onClick={() => navigate('/official-driver')}
            className="bg-primary hover:bg-primary/90"
          >
            Register as Driver
          </Button>
        </div>
      );
    }
    
    // Application pending approval
    if (driverStatus.isPending) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Loader2 className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Application Pending</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your driver application is under review. We'll notify you once it's approved.
          </p>
          <div className="space-x-4">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
            >
              Go to Home
            </Button>
            <Button 
              onClick={() => navigate('/official-driver')}
              className="bg-primary hover:bg-primary/90"
            >
              View Application
            </Button>
          </div>
        </div>
      );
    }
    
    // Approved but insufficient deposit
    if (driverStatus.isApproved && !driverStatus.hasSufficientDeposit) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Security Deposit Required</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You need to add a security deposit of <span className="font-bold">{driverStatus.depositRequired} RS</span> to your wallet to accept rides.
          </p>
          <Button 
            onClick={() => navigate('/wallet')}
            className="bg-primary hover:bg-primary/90"
          >
            Add Funds to Wallet
          </Button>
        </div>
      );
    }
    
    // Fully approved driver - show ride requests
    return (
      <div className="flex flex-col gap-4">
        {/* Location Status Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <DriverLocationStatus
            coordinates={coordinates}
            isTracking={isTracking}
            error={locationError}
            lastUpdateTime={lastUpdateTime}
          />
          
          <div className="p-3 border-t border-gray-100 flex justify-between items-center">
            <Button 
              variant={isOnline ? "default" : "outline"} 
              size="sm"
              onClick={toggleOnlineStatus}
              className={isOnline ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Power className="h-4 w-4 mr-1" />
              {isOnline ? 'Online' : 'Go Online'}
            </Button>
            
            <div className="flex gap-2">
              <CreateTestRideButton 
                onSuccess={handleTestRideCreated} 
                variant="outline" 
              />
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={loadingRides || !isOnline}
              >
                {loadingRides ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} className="mr-1" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Debug Info */}
        {import.meta.env.DEV && (
          <div className="bg-gray-50 p-3 text-xs border rounded-lg">
            <p className="font-bold mb-1">Debug Info:</p>
            <p>User ID: {user?.id || "Not logged in"}</p>
            <p>Driver eligible: {isEligible ? "Yes" : "No"}</p>
            <p>Location tracking: {isTracking ? "Active" : "Inactive"}</p>
            <p>Coordinates: {coordinates ? `[${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}]` : "None"}</p>
          </div>
        )}
        
        {/* Error Display */}
        {ridesError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error loading ride requests</p>
              <p className="text-sm text-red-600 mt-1">{ridesError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Ride Requests */}
        {loadingRides ? (
          <div className="py-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-gray-600">Looking for ride requests...</p>
          </div>
        ) : rideRequests.length > 0 ? (
          <div className="space-y-4">
            {rideRequests.map(ride => (
              <RideRequestItem
                key={ride.id}
                ride={ride}
                isAccepting={acceptingRide === ride.id}
                onAccept={handleAcceptRide}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center bg-white rounded-lg shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-6">No ride requests available at the moment</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <CreateTestRideButton onSuccess={handleTestRideCreated} />
              <Button 
                onClick={handleRefresh}
                disabled={!isOnline}
                className="bg-primary hover:bg-primary/90"
              >
                Refresh Requests
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')} 
            className="mr-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Ride Requests</h1>
        </div>
        
        {isEligible && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <div className="p-4 max-w-md mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default RideRequests;
