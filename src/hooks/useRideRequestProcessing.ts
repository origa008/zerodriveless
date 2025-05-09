
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RideRequest } from '@/lib/types';

/**
 * Hook for handling ride request processing actions
 */
export function useRideRequestProcessing(driverId: string | undefined) {
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Function to accept a ride
  const acceptRide = async (ride: RideRequest) => {
    if (!driverId) {
      console.error("Driver ID is undefined, cannot accept ride");
      toast({
        title: "Error",
        description: "Your driver ID is missing. Please sign in again.",
        variant: "destructive"
      });
      return null;
    }
    
    if (!ride.pickup?.coordinates) {
      console.error("Ride has no pickup coordinates");
      toast({
        title: "Error",
        description: "Ride details are incomplete",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      console.log(`Driver ${driverId} accepting ride ${ride.id}`);
      setAcceptingRide(ride.id);
      
      // Check if ride is still available
      const { data: rideCheck, error: checkError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', ride.id)
        .eq('status', 'searching')
        .is('driver_id', null)
        .single();
        
      if (checkError) {
        console.error("Error checking ride availability:", checkError);
        throw new Error("Could not check ride availability");
      }
      
      if (!rideCheck) {
        throw new Error("This ride is no longer available");
      }
      
      console.log("Ride is available, updating status to confirmed");
      
      // Update ride with driver info
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          driver_id: driverId,
          status: 'confirmed',
          start_time: new Date().toISOString(),
          driver_location: {
            type: 'Point',
            coordinates: ride.pickup.coordinates,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', ride.id);
        
      if (updateError) {
        console.error("Error updating ride:", updateError);
        throw updateError;
      }
      
      console.log("Getting updated ride details");
      
      // Get updated ride details with passenger info
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
        
      if (error) {
        console.error("Error fetching updated ride:", error);
        throw new Error("Could not retrieve updated ride information");
      }
      
      if (!acceptedRide) {
        throw new Error("Ride not found after accepting");
      }
      
      console.log("Ride accepted successfully:", acceptedRide.id);
      
      toast({
        title: "Success",
        description: "You have accepted the ride",
      });
      
      return acceptedRide;
    } catch (err: any) {
      console.error("Error accepting ride:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept ride",
        variant: "destructive"
      });
      return null;
    } finally {
      setAcceptingRide(null);
    }
  };
  
  return {
    acceptRide,
    acceptingRide
  };
}

export default useRideRequestProcessing;
