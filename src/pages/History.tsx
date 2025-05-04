
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { Ride } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

const History: React.FC = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRideHistory = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching ride history:', error);
        } else {
          // Transform the data to match the Ride type
          const transformedRides = (data || []).map((ride: any): Ride => {
            // Process pickup location
            let pickup = {
              name: 'Unknown location',
              coordinates: [0, 0] as [number, number]
            };
            
            if (ride.pickup_location) {
              const pickupData = typeof ride.pickup_location === 'string' 
                ? JSON.parse(ride.pickup_location) 
                : ride.pickup_location;
                
              pickup = {
                name: pickupData.name || 'Unknown pickup',
                coordinates: Array.isArray(pickupData.coordinates) 
                  ? pickupData.coordinates 
                  : [0, 0]
              };
            }
            
            // Process dropoff location
            let dropoff = {
              name: 'Unknown location',
              coordinates: [0, 0] as [number, number]
            };
            
            if (ride.dropoff_location) {
              const dropoffData = typeof ride.dropoff_location === 'string'
                ? JSON.parse(ride.dropoff_location)
                : ride.dropoff_location;
                
              dropoff = {
                name: dropoffData.name || 'Unknown dropoff',
                coordinates: Array.isArray(dropoffData.coordinates)
                  ? dropoffData.coordinates
                  : [0, 0]
              };
            }
            
            // Process ride option
            let rideOption = {
              id: 'unknown',
              name: 'Unknown',
              type: 'unknown',
              basePrice: 0
            };
            
            if (ride.ride_option) {
              const optionData = typeof ride.ride_option === 'string'
                ? JSON.parse(ride.ride_option)
                : ride.ride_option;
                
              rideOption = {
                id: optionData.id || 'unknown',
                name: optionData.name || 'Unknown',
                type: optionData.type || 'unknown',
                basePrice: optionData.basePrice || ride.price || 0
              };
            }
            
            return {
              id: ride.id,
              pickup,
              dropoff,
              rideOption,
              status: ride.status,
              price: ride.price || 0,
              distance: ride.distance || 0,
              duration: ride.duration || 0,
              currency: ride.currency || 'RS',
              start_time: ride.start_time,
              end_time: ride.end_time,
              paymentMethod: ride.payment_method || 'cash'
            } as Ride;
          });
          
          setRides(transformedRides);
        }
      } catch (error) {
        console.error('Error fetching ride history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRideHistory();
  }, [user?.id]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return <p>Loading ride history...</p>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Ride History</h1>
      {rides.length === 0 ? (
        <p>No ride history available.</p>
      ) : (
        <div className="grid gap-4">
          {rides.map((ride) => (
            <Card key={ride.id}>
              <CardHeader>
                <CardTitle>Ride ID: {ride.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Pickup: {ride.pickup?.name}</p>
                <p>Dropoff: {ride.dropoff?.name}</p>
                <p>Status: {ride.status}</p>
                <p>Price: {ride.price} {ride.currency}</p>
                <p>Distance: {ride.distance} km</p>
                <p>Duration: {ride.duration} minutes</p>
                
                {ride.start_time && ride.end_time && (
                  <p>
                    Time: {formatDate(ride.start_time)} - {formatDate(ride.end_time)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
