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
          setRides(data as Ride[]);
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
