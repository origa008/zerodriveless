
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

/**
 * Increases the bid amount for a ride
 * @param ride The current ride
 * @param newBidAmount The new bid amount
 * @param setCurrentRide Function to update the current ride state
 */
export const increaseBid = async (
  ride: Ride, 
  newBidAmount: number,
  setCurrentRide: (ride: Ride) => void
): Promise<boolean> => {
  if (!ride) return false;
  
  try {
    // Update ride with new bid in the database
    const { error } = await supabase
      .from('rides')
      .update({ price: newBidAmount })
      .eq('id', ride.id);
    
    if (error) {
      toast({
        title: "Bid Update Failed",
        description: "Could not update your bid. Please try again.",
        variant: "destructive"
      });
      return false;
    }
    
    // Update local state
    setCurrentRide({
      ...ride,
      price: newBidAmount
    });
    
    toast({
      title: "Bid Increased",
      description: `Your bid has been increased to ${newBidAmount} RS to attract drivers.`,
      duration: 5000
    });
    
    return true;
  } catch (error) {
    console.error('Error increasing bid:', error);
    toast({
      title: "Bid Update Failed",
      description: "An unexpected error occurred. Please try again.",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Checks if a ride has been accepted by a driver
 * @param rideId The ID of the ride to check
 */
export const checkRideAccepted = async (rideId: string): Promise<Ride | null> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        id,
        status,
        driver_id,
        pickup_location,
        dropoff_location,
        ride_option,
        price,
        currency,
        distance,
        duration,
        start_time,
        end_time,
        payment_method
      `)
      .eq('id', rideId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // If ride has been confirmed, get driver details
    if (data.status === 'confirmed' && data.driver_id) {
      const { data: driverData } = await supabase
        .from('profiles')
        .select('id, name, avatar, phone')
        .eq('id', data.driver_id)
        .single();
      
      // Return transformed ride object
      return {
        id: data.id,
        pickup: data.pickup_location,
        dropoff: data.dropoff_location,
        rideOption: data.ride_option,
        driver: driverData || undefined,
        status: data.status,
        price: data.price,
        currency: data.currency,
        distance: data.distance,
        duration: data.duration,
        startTime: data.start_time ? new Date(data.start_time) : undefined,
        endTime: data.end_time ? new Date(data.end_time) : undefined,
        paymentMethod: data.payment_method
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking ride status:', error);
    return null;
  }
};
