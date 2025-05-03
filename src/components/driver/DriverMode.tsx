
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, User, Clock } from 'lucide-react';
import { updateDriverStatus } from '@/lib/utils/driverUtils';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { updateDriverLocation } from '@/lib/utils/driverLocation';

const DriverMode: React.FC = () => {
  const { user } = useAuth();
  const { setDriverMode, isDriverMode } = useRide();
  const { toast } = useToast();
  const { coordinates, startTracking, stopTracking, isTracking } = useLocationTracking();
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // Load initial state and set up listeners
  useEffect(() => {
    if (!user || !user.isVerifiedDriver) return;

    const loadInitialState = async () => {
      setIsLoading(true);
      try {
        // Get driver's current status
        const { data: driverData, error: driverError } = await supabase
          .from('driver_details')
          .select('status, approval_date')
          .eq('user_id', user.id)
          .single();

        if (driverError) throw driverError;
        
        // Check if driver is active/online based on status field
        const isCurrentlyOnline = driverData?.status === 'active';
        setIsOnline(isCurrentlyOnline);
        
        if (isCurrentlyOnline) {
          startTracking();
        }

        // Load any pending ride requests
        await loadPendingRides();
        
      } catch (error) {
        console.error("Error loading driver mode:", error);
        toast({
          title: "Error",
          description: "Could not load driver status",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
    
    // Set up subscription for new ride requests
    const channel = supabase.channel('public:rides');
    
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rides',
          filter: 'status=eq.searching'
        }, 
        (payload) => {
          // Add the new ride to the pending rides
          setPendingRides((prevRides) => {
            // Check if we already have this ride
            const exists = prevRides.some(ride => ride.id === payload.new.id);
            if (!exists) {
              return [...prevRides, payload.new];
            }
            return prevRides;
          });
          
          // Notify the driver
          if (isOnline) {
            toast({
              title: "New Ride Request",
              description: "A new ride request is available",
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
      stopTracking();
      channel.unsubscribe();
    };
  }, [user]);

  // Update location when online and coordinates change
  useEffect(() => {
    if (isOnline && coordinates && user?.id) {
      // Update driver location when coordinates change
      const updateLocation = async () => {
        try {
          await updateDriverLocation(user.id, coordinates);
        } catch (error) {
          console.error("Error updating location:", error);
        }
      };
      
      updateLocation();
      
      // Clear any existing interval
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
      
      // Set up interval for periodic updates
      const interval = setInterval(updateLocation, 30000); // Update every 30 seconds
      setLocationUpdateInterval(interval);
      
      // Clean up on unmount or when offline
      return () => {
        clearInterval(interval);
      };
    } else if (!isOnline && locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
  }, [isOnline, coordinates, user?.id]);

  const toggleDriverMode = async () => {
    if (!user?.id) return;
    
    try {
      const newStatus = !isOnline;
      setIsLoading(true);
      
      // Update status in database
      const { success, error } = await updateDriverStatus(
        user.id, 
        newStatus ? 'online' : 'offline'
      );
      
      if (!success) {
        throw new Error(error || "Failed to update status");
      }
      
      // Update local state
      setIsOnline(newStatus);
      setDriverMode(newStatus);
      
      // Start or stop location tracking
      if (newStatus) {
        startTracking();
        toast({
          title: "Driver Mode Activated",
          description: "You're now visible to passengers",
        });
        
        // Load pending rides
        loadPendingRides();
      } else {
        stopTracking();
        if (locationUpdateInterval) {
          clearInterval(locationUpdateInterval);
          setLocationUpdateInterval(null);
        }
        toast({
          title: "Driver Mode Deactivated",
          description: "You're now offline",
        });
      }
    } catch (error: any) {
      console.error("Error toggling driver mode:", error);
      toast({
        title: "Error",
        description: error.message || "Could not update driver status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingRides = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'searching')
        .is('driver_id', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setPendingRides(data || []);
    } catch (error) {
      console.error("Error loading pending rides:", error);
    }
  };

  // Render
  if (!user || !user.isVerifiedDriver) {
    return (
      <Card className="p-4 text-center">
        <p>You need to be a verified driver to access Driver Mode</p>
        <Button className="mt-2" onClick={() => window.location.href = '/official-driver'}>
          Become a Driver
        </Button>
      </Card>
    );
  }

  return (
    <div className="p-4">
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Driver Mode</h3>
            <p className="text-sm text-gray-500">
              {isOnline ? 'You are online and visible to passengers' : 'Go online to receive ride requests'}
            </p>
          </div>
          <Switch 
            checked={isOnline} 
            onCheckedChange={toggleDriverMode}
            disabled={isLoading}
          />
        </div>
        
        {isOnline && coordinates && (
          <div className="text-xs text-gray-500">
            Location sharing active at [{coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}]
          </div>
        )}
      </Card>
      
      {isOnline && pendingRides.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Available Requests ({pendingRides.length})</h3>
          <div className="space-y-3">
            {pendingRides.slice(0, 3).map(ride => (
              <Card key={ride.id} className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <Badge className="bg-blue-500">{ride.ride_option?.name || "Ride"}</Badge>
                  <span className="font-bold">{ride.price} {ride.currency}</span>
                </div>
                
                <div className="text-sm">
                  <div className="flex items-center text-gray-700 mb-1">
                    <Clock size={12} className="mr-1" />
                    <span>{ride.duration} min · {ride.distance} km</span>
                  </div>
                  
                  <div className="line-clamp-1">
                    <span className="text-xs bg-gray-100 rounded px-1 py-0.5 mr-1">From</span>
                    {ride.pickup?.name || ride.pickup_location?.name || "Unknown"}
                  </div>
                  
                  <div className="line-clamp-1">
                    <span className="text-xs bg-gray-100 rounded px-1 py-0.5 mr-1">To</span>
                    {ride.dropoff?.name || ride.dropoff_location?.name || "Unknown"}
                  </div>
                </div>
              </Card>
            ))}
            
            {pendingRides.length > 3 && (
              <p className="text-center text-sm text-gray-500">
                +{pendingRides.length - 3} more requests available
              </p>
            )}
            
            <Button onClick={() => window.location.href = '/ride-requests'} className="w-full">
              View All Requests
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverMode;
