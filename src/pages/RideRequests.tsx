import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Loader2, RefreshCw, Power } from 'lucide-react';
import { useRealTimeDriverLocation } from '@/hooks/useRealTimeDriverLocation';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { DriverLocationStatus } from '@/components/DriverLocationStatus';
import { RideRequestItem } from '@/components/RideRequestItem';
import { CreateTestRideButton } from '@/components/CreateTestRideButton';
import { RideRequest } from '@/lib/types';
import { extractCoordinates, extractLocationName } from '@/lib/utils/locationUtils';
import { useRideRequestsLoader } from '@/hooks/useRideRequestsLoader';
import { supabase } from '@/integrations/supabase/client';

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
  
  // State for accepting rides
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  
  // Load ride requests with our simplified hook
  const {
    rides: rideRequests,
    loading: loadingRides,
    error: ridesError,
    refresh: fetchRideRequests
  } = useRideRequestsLoader({
    driverId: user?.id,
    enabled: isOnline && !!user?.id && isEligible,
    autoRefreshInterval: 15000 // Refresh every 15 seconds
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
  
  // Handle test ride creation
  const handleTestRideCreated = () => {
    fetchRideRequests();
    toast({
      title: "Refreshing",
      description: "Looking for the new test ride..."
    });
  };
  
  // Function to accept a ride
  const handleAcceptRide = async (ride: RideRequest) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You need to be logged in to accept rides",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAcceptingRide(ride.id);
      console.log(`Driver ${user.id} accepting ride ${ride.id}`);
      
      // First, check if ride is still available
      const { data: rideCheck, error: checkError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', ride.id)
        .eq('status', 'searching')
        .is('driver_id', null)
        .single();
        
      if (checkError || !rideCheck) {
        console.error("Error checking ride availability:", checkError);
        toast({
          title: "Error",
          description: "This ride is no longer available",
          variant: "destructive"
        });
        return;
      }
      
      // Update ride with driver info
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          driver_id: user.id,
          status: 'accepted', // Now this is a valid status in our type definition
          start_time: new Date().toISOString()
        })
        .eq('id', ride.id);
        
      if (updateError) {
        console.error("Error updating ride:", updateError);
        toast({
          title: "Error",
          description: "Failed to accept ride",
          variant: "destructive"
        });
        return;
      }
      
      // Get updated ride details with passenger info
      const { data: acceptedRide, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:profiles!passenger_id (
            id, name, avatar
          )
        `)
        .eq('id', ride.id)
        .single();
        
      if (error || !acceptedRide) {
        console.error("Error fetching updated ride:", error);
        toast({
          title: "Error",
          description: "Failed to get ride details",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Ride accepted successfully:", acceptedRide);
      
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
        status: 'accepted' as const, // This is now explicitly allowed by the type
        paymentMethod: (acceptedRide.payment_method as 'cash' | 'wallet') || 'cash',
        currency: acceptedRide.currency || 'RS',
        passenger: acceptedRide.passenger
      };
      
      toast({
        title: "Success",
        description: "You have accepted the ride",
      });
      
      // Set as current ride and navigate
      setCurrentRide(currentRide);
      navigate('/ride-completed'); // Changed from '/ride-progress' to '/ride-completed'
      
    } catch (err: any) {
      console.error("Error accepting ride:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept ride",
        variant: "destructive"
      });
    } finally {
      setAcceptingRide(null);
    }
  };
  
  // Render content based on driver status
  const renderContent = () => {
    if (driverStatus.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 text-black animate-spin mb-4" />
          <p className="text-center text-gray-600">Checking your driver status...</p>
        </div>
      );
    }
    
    // Not registered as driver
    if (!driverStatus.isRegistered) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Register as a Driver</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You need to register as a driver to access this feature. Complete the driver registration process to continue.
          </p>
          <Button 
            onClick={() => navigate('/official-driver')}
            className="bg-black hover:bg-gray-800 text-white"
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
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Loader2 className="h-6 w-6 text-black" />
          </div>
          <h2 className="text-xl font-bold mb-2">Application Pending</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your driver application is under review. We'll notify you once it's approved.
          </p>
          <div className="space-x-4">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="border-black text-black"
            >
              Go to Home
            </Button>
            <Button 
              onClick={() => navigate('/official-driver')}
              className="bg-black hover:bg-gray-800 text-white"
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
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Security Deposit Required</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You need to add a security deposit of <span className="font-bold">{driverStatus.depositRequired} RS</span> to your wallet to accept rides.
          </p>
          <Button 
            onClick={() => navigate('/wallet')}
            className="bg-black hover:bg-gray-800 text-white"
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
              className={isOnline ? "bg-black hover:bg-gray-800 text-white" : "border-black text-black"}
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
                className="border-black text-black"
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
        
        {/* Ride Requests */}
        {loadingRides ? (
          <div className="py-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-black animate-spin mb-3" />
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
              <MapPin className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-gray-600 mb-6">No ride requests available at the moment</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <CreateTestRideButton onSuccess={handleTestRideCreated} />
              <Button 
                onClick={handleRefresh}
                disabled={!isOnline}
                className="bg-black hover:bg-gray-800 text-white"
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
            className="mr-2 text-black"
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
