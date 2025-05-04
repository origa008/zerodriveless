
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, ArrowLeft, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { RideRequest } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useLocationTracking } from '@/hooks/useLocationTracking';

interface DriverStatus {
  isRegistered: boolean;
  isPending: boolean;
  isApproved: boolean;
  hasSufficientDeposit: boolean;
  depositRequired: number;
}

const RideRequests: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setCurrentRide, setDriverMode } = useRide();
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  const { coordinates, isTracking, startTracking } = useLocationTracking();
  const [driverStatus, setDriverStatus] = useState<DriverStatus>({
    isRegistered: false,
    isPending: false,
    isApproved: false,
    hasSufficientDeposit: false,
    depositRequired: 3000
  });

  // Start location tracking when component mounts
  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  // Check driver eligibility on component mount
  useEffect(() => {
    const checkDriverEligibility = async () => {
      if (!user?.id) {
        navigate('/login');
        return;
      }

      setStatusLoading(true);
      
      try {
        // Check if user is registered as driver
        const { data: driverDetails, error: driverError } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (driverError) {
          console.error("Error checking driver status:", driverError);
          throw driverError;
        }

        // If not registered as driver
        if (!driverDetails) {
          setDriverStatus({
            isRegistered: false,
            isPending: false,
            isApproved: false,
            hasSufficientDeposit: false,
            depositRequired: 3000
          });
          setStatusLoading(false);
          return;
        }

        // User is registered, check approval status
        const isApproved = driverDetails.status === 'approved';
        
        // If approved, check deposit status
        let hasSufficientDeposit = driverDetails.has_sufficient_deposit;
        const depositRequired = driverDetails.deposit_amount_required || 3000;

        // If has_sufficient_deposit field isn't available or reliable, check wallet directly
        if (isApproved && !hasSufficientDeposit) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();
            
          if (wallet) {
            hasSufficientDeposit = wallet.balance >= depositRequired;
            
            // Update the has_sufficient_deposit flag in driver_details if needed
            if (hasSufficientDeposit !== driverDetails.has_sufficient_deposit) {
              await supabase
                .from('driver_details')
                .update({ has_sufficient_deposit: hasSufficientDeposit })
                .eq('user_id', user.id);
            }
          }
        }

        // Set driver status
        setDriverStatus({
          isRegistered: true,
          isPending: driverDetails.status === 'pending',
          isApproved,
          hasSufficientDeposit,
          depositRequired
        });
        
        // Driver mode should be active if all conditions are met
        setDriverMode(isApproved && hasSufficientDeposit);
        
        // Load ride requests if eligible
        if (isApproved && hasSufficientDeposit && coordinates) {
          loadRideRequests();
        }
        
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
        toast({
          title: "Error",
          description: "Could not verify driver status",
          variant: "destructive"
        });
      } finally {
        setStatusLoading(false);
      }
    };

    checkDriverEligibility();
  }, [user, coordinates, navigate, setDriverMode]);

  // Subscribe to real-time ride updates when driver is eligible
  useEffect(() => {
    if (!user?.id || !coordinates || 
        !driverStatus.isApproved || 
        !driverStatus.hasSufficientDeposit) {
      return; // Don't subscribe if not eligible
    }
    
    // Subscribe to new rides and updates
    const channel = supabase
      .channel('ride_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `status=eq.searching`
        },
        () => {
          // Reload ride requests when changes occur
          loadRideRequests();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, coordinates, driverStatus]);

  const loadRideRequests = async () => {
    if (!coordinates || !user?.id) {
      toast({
        title: "Location Required",
        description: "Please enable location services to see ride requests",
        variant: "default"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get driver details to check vehicle type
      const { data: driverDetails } = await supabase
        .from('driver_details')
        .select('vehicle_type')
        .eq('user_id', user.id)
        .single();
        
      if (!driverDetails) {
        throw new Error("Driver details not found");
      }
      
      // Get all searching rides
      const { data: rides, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:profiles!passenger_id (
            id, name, avatar
          )
        `)
        .eq('status', 'searching')
        .is('driver_id', null);
      
      if (error) throw error;
      
      if (!rides || rides.length === 0) {
        setRideRequests([]);
        setLoading(false);
        return;
      }

      // Filter rides by proximity and vehicle type
      const nearbyRides = rides.filter(ride => {
        // Extract vehicle type from ride option
        let rideVehicleType = "";
        if (ride.ride_option) {
          if (typeof ride.ride_option === 'string') {
            try {
              const parsed = JSON.parse(ride.ride_option);
              rideVehicleType = parsed?.type?.toLowerCase() || "";
            } catch (e) {
              console.error("Error parsing ride option:", e);
            }
          } else if (ride.ride_option && typeof ride.ride_option === 'object') {
            // Handle as object with proper type check 
            if (!Array.isArray(ride.ride_option) && ride.ride_option.type) {
              rideVehicleType = ride.ride_option.type.toLowerCase();
            }
          }
        }
        
        // Skip vehicle type check if rideVehicleType is empty
        const vehicleMatches = !rideVehicleType || 
          rideVehicleType === driverDetails.vehicle_type.toLowerCase();
        
        if (!vehicleMatches) return false;

        // Extract coordinates
        const pickupCoords = extractCoordinates(ride.pickup_location);
        if (!pickupCoords) return false;
        
        const [pickupLng, pickupLat] = pickupCoords;
        
        // Calculate distance to pickup
        const distance = calculateDistance(
          [coordinates[0], coordinates[1]], // [longitude, latitude]
          [pickupLng, pickupLat]
        );
        
        // Only include rides within 10km
        return distance <= 10;
      }).map(ride => {
        // Extract coordinates
        const pickupCoords = extractCoordinates(ride.pickup_location);
        const [pickupLng, pickupLat] = pickupCoords || [0, 0];
        
        // Calculate distance to pickup
        const distanceToPickup = calculateDistance(
          [coordinates[0], coordinates[1]], // [longitude, latitude] 
          [pickupLng, pickupLat]
        );
        
        // Convert to RideRequest type
        return {
          id: ride.id,
          passenger_id: ride.passenger_id,
          driver_id: ride.driver_id,
          pickup: {
            name: extractLocationName(ride.pickup_location),
            coordinates: [pickupLng, pickupLat]
          },
          dropoff: {
            name: extractLocationName(ride.dropoff_location),
            coordinates: extractCoordinates(ride.dropoff_location) || [0, 0]
          },
          pickup_location: ride.pickup_location,
          dropoff_location: ride.dropoff_location,
          ride_option: ride.ride_option,
          status: ride.status,
          price: ride.price,
          currency: ride.currency,
          distance: ride.distance,
          duration: ride.duration,
          start_time: ride.start_time,
          end_time: ride.end_time,
          payment_method: ride.payment_method,
          created_at: ride.created_at,
          passenger: ride.passenger,
          distance_to_pickup: Number(distanceToPickup.toFixed(1))
        };
      });
      
      // Sort by distance to pickup
      nearbyRides.sort((a, b) => 
        (a.distance_to_pickup || 0) - (b.distance_to_pickup || 0)
      );
      
      setRideRequests(nearbyRides);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      toast({
        title: "Error",
        description: "Could not load ride requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = async (ride: RideRequest) => {
    if (!user?.id || !coordinates) {
      toast({
        title: "Error",
        description: "Location or user information missing",
        variant: "destructive"
      });
      return;
    }
    
    setAcceptingRide(ride.id);
    
    try {
      // First check if ride is still available
      const { data: rideCheck, error: checkError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', ride.id)
        .eq('status', 'searching')
        .is('driver_id', null)
        .single();
        
      if (checkError || !rideCheck) {
        throw new Error("This ride is no longer available");
      }
      
      // Update ride with driver info
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          driver_id: user.id,
          status: 'confirmed',
          start_time: new Date().toISOString(),
          driver_location: {
            longitude: coordinates[0],
            latitude: coordinates[1],
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', ride.id);
        
      if (updateError) throw updateError;
      
      // Get updated ride details
      const { data: acceptedRide, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:profiles!passenger_id (
            id, name, avatar, phone
          )
        `)
        .eq('id', ride.id)
        .single();
        
      if (error || !acceptedRide) {
        throw new Error("Could not retrieve updated ride information");
      }
      
      // Set as current ride in context
      const currentRide = {
        id: acceptedRide.id,
        pickup: acceptedRide.pickup_location,
        dropoff: acceptedRide.dropoff_location,
        rideOption: acceptedRide.ride_option,
        price: acceptedRide.price,
        distance: acceptedRide.distance,
        duration: acceptedRide.duration,
        status: 'confirmed',
        paymentMethod: acceptedRide.payment_method,
        currency: acceptedRide.currency,
        passenger: acceptedRide.passenger
      };
      
      setCurrentRide(currentRide);
      
      toast({
        title: "Ride Accepted",
        description: "You have successfully accepted this ride"
      });
      
      // Navigate to ride progress
      navigate('/ride-progress');
      
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

  // Helper function to extract coordinates from location object
  const extractCoordinates = (location: any): [number, number] | null => {
    if (!location) return null;
    
    try {
      // Handle string JSON
      if (typeof location === 'string') {
        try {
          location = JSON.parse(location);
        } catch (e) {
          return null;
        }
      }
      
      // Check if coordinates exist directly
      if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        return location.coordinates as [number, number];
      }
      
      // Check for x,y format
      if (location.x !== undefined && location.y !== undefined) {
        return [location.x, location.y];
      }
      
      // Check for longitude,latitude format
      if (location.longitude !== undefined && location.latitude !== undefined) {
        return [location.longitude, location.latitude];
      }
      
      // Check for lng,lat format
      if (location.lng !== undefined && location.lat !== undefined) {
        return [location.lng, location.lat];
      }
      
      return null;
    } catch (e) {
      console.error('Error extracting coordinates:', e);
      return null;
    }
  };
  
  // Helper function to extract name from location
  const extractLocationName = (location: any): string => {
    if (!location) return "Unknown";
    
    try {
      // Handle string JSON
      if (typeof location === 'string') {
        try {
          location = JSON.parse(location);
        } catch (e) {
          return "Unknown";
        }
      }
      
      // Check if name exists directly
      if (typeof location === 'object' && location !== null && 'name' in location) {
        return location.name || "Unknown";
      }
      
      return "Unknown";
    } catch (e) {
      return "Unknown";
    }
  };
  
  // Calculate distance using Haversine formula
  const calculateDistance = (
    point1: [number, number], 
    point2: [number, number]
  ): number => {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  };

  // Render different content based on driver status
  const renderContent = () => {
    if (statusLoading) {
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
            onClick={() => navigate('/register-driver')}
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
                    {typeof ride.ride_option === 'object' && ride.ride_option !== null && !Array.isArray(ride.ride_option) && 'name' in ride.ride_option
                      ? ride.ride_option.name
                      : 'Standard'}
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
