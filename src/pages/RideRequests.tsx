
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, ArrowLeft, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { Ride, RideRequest } from '@/lib/types';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { useRideRequests } from '@/hooks/useRideRequests';
import { extractLocationName, extractCoordinates } from '@/lib/utils/locationUtils';

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentRide, setDriverMode } = useRide();
  const { coordinates, isTracking, startTracking } = useLocationTracking();
  const driverStatus = useDriverStatus(user?.id);
  
  // Check if user is eligible to see ride requests
  const isEligible = driverStatus.isApproved && driverStatus.hasSufficientDeposit;
  
  // Load ride requests if eligible
  const { 
    rideRequests, 
    loading, 
    loadRideRequests, 
    acceptRide,
    acceptingRide 
  } = useRideRequests(user?.id, coordinates, isEligible);

  // Start location tracking when component mounts
  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  // Set driver mode based on eligibility
  useEffect(() => {
    setDriverMode(isEligible);
  }, [isEligible, setDriverMode]);

  // Load ride requests when coordinates or eligibility changes
  useEffect(() => {
    if (isEligible && coordinates) {
      loadRideRequests();
    }
  }, [isEligible, coordinates]);

  // Handle accepting a ride
  const handleAcceptRide = async (ride: RideRequest) => {
    const acceptedRide = await acceptRide(ride);
    
    if (!acceptedRide) return;
    
    // Extract location details for the ride context
    const pickupCoords = extractCoordinates(acceptedRide.pickup_location);
    const dropoffCoords = extractCoordinates(acceptedRide.dropoff_location);
    
    // Create ride object for the context
    const currentRide: Ride = {
      id: acceptedRide.id,
      pickup: {
        name: extractLocationName(acceptedRide.pickup_location),
        coordinates: pickupCoords ? pickupCoords as [number, number] : [0, 0] as [number, number]
      },
      dropoff: {
        name: extractLocationName(acceptedRide.dropoff_location),
        coordinates: dropoffCoords ? dropoffCoords as [number, number] : [0, 0] as [number, number]
      },
      rideOption: {
        id: '1',
        name: 'Standard',
        type: 'car',
        basePrice: acceptedRide.price || 0
      },
      price: acceptedRide.price,
      distance: acceptedRide.distance,
      duration: acceptedRide.duration,
      status: 'confirmed',
      paymentMethod: acceptedRide.payment_method as 'cash' | 'wallet',
      currency: acceptedRide.currency,
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
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Checking driver status...</p>
        </div>
      );
    }
    
    // Not registered as driver
    if (!driverStatus.isRegistered) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Register as Driver</h2>
          <p className="text-gray-600 mb-6">
            You need to register as a driver to access this feature. Complete the driver registration process to continue.
          </p>
          <Button 
            onClick={() => navigate('/official-driver')}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Register as Driver
          </Button>
        </div>
      );
    }
    
    // Application pending approval
    if (driverStatus.isPending) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Application Pending</h2>
          <p className="text-gray-600 mb-6">
            Your driver application is pending approval. We'll notify you once it's approved.
          </p>
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="mr-4"
          >
            Go to Home
          </Button>
          <Button 
            onClick={() => navigate('/official-driver')}
            className="bg-violet-600 hover:bg-violet-700"
          >
            View Application
          </Button>
        </div>
      );
    }
    
    // Approved but insufficient deposit
    if (driverStatus.isApproved && !driverStatus.hasSufficientDeposit) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Security Deposit Required</h2>
          <p className="text-gray-600 mb-6">
            You need to add a security deposit of <span className="font-bold">{driverStatus.depositRequired} RS</span> to your wallet to accept rides.
          </p>
          <Button 
            onClick={() => navigate('/wallet')}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Add Funds to Wallet
          </Button>
        </div>
      );
    }
    
    // Fully eligible driver - show ride requests
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading ride requests...</p>
        </div>
      );
    } else if (rideRequests.length > 0) {
      return (
        <div className="grid gap-4">
          {rideRequests.map(ride => (
            <Card key={ride.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-blue-500">
                    {ride.ride_option.name || 'Standard'}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-lg">{ride.price} {ride.currency || 'RS'}</p>
                    <p className="text-gray-500 text-sm">{ride.distance} km</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-start">
                    <div className="min-w-8 mr-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mx-auto"></div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pickup</p>
                      <p className="font-medium">{ride.pickup.name || 'Pickup Location'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="min-w-8 mr-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 mx-auto"></div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dropoff</p>
                      <p className="font-medium">{ride.dropoff.name || 'Dropoff Location'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <Clock size={16} className="mr-1" />
                    {ride.duration} min
                  </span>
                  
                  {ride.distance_to_pickup !== undefined && (
                    <span className="flex items-center">
                      <MapPin size={16} className="mr-1" />
                      {ride.distance_to_pickup.toFixed(1)} km away
                    </span>
                  )}
                  
                  {ride.passenger && (
                    <span className="flex items-center">
                      <User size={16} className="mr-1" />
                      {ride.passenger.name || "Anonymous"}
                    </span>
                  )}
                </div>
                
                <Button
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={acceptingRide === ride.id}
                  onClick={() => handleAcceptRide(ride)}
                >
                  {acceptingRide === ride.id ? (
                    <>
                      <Loader size={16} className="mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : 'Accept Ride'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      );
    } else {
      return (
        <div className="py-10 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No ride requests available at the moment</p>
          <Button onClick={loadRideRequests}>Refresh</Button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')} 
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold">Available Ride Requests</h1>
        
        {driverStatus.isApproved && driverStatus.hasSufficientDeposit && (
          <Button 
            onClick={loadRideRequests} 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            disabled={loading}
          >
            Refresh
          </Button>
        )}
      </div>
      
      <div className="p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default RideRequests;
