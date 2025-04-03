
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import FeedbackForm from '@/components/ride/FeedbackForm';
import ChatPanel from '@/components/ride/ChatPanel';
import { createTransaction, updateRideStatus } from '@/lib/utils/supabaseUtils';

const RideCompleted: React.FC = () => {
  const navigate = useNavigate();
  const { currentRide, isDriverMode } = useRide();
  const { user } = useAuth();

  useEffect(() => {
    if (!currentRide || currentRide.status !== 'completed') {
      navigate('/');
      return;
    }

    // Update ride status in Supabase if it's not already done
    const updateRideInSupabase = async () => {
      if (currentRide.id) {
        await updateRideStatus(currentRide.id, 'completed');
      }
    };

    updateRideInSupabase();
  }, [currentRide, navigate]);

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    if (!user || !currentRide) return;

    try {
      // Record the transaction for the ride
      if (isDriverMode) {
        // Driver earns the fare
        await createTransaction({
          userId: user.id,
          amount: currentRide.price,
          type: 'fare',
          status: 'completed',
          description: `Earnings for ride to ${currentRide.dropoff.name}`,
          paymentMethod: currentRide.paymentMethod,
          rideId: currentRide.id
        });
      } else if (currentRide.paymentMethod === 'wallet') {
        // Passenger pays via wallet
        await createTransaction({
          userId: user.id,
          amount: -currentRide.price,
          type: 'fare',
          status: 'completed',
          description: `Payment for ride to ${currentRide.dropoff.name}`,
          paymentMethod: 'wallet',
          rideId: currentRide.id
        });
      }

      // TODO: Submit rating to the ratings table
      // This would be implemented when we have driver/passenger details

      navigate('/');
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  };

  if (!currentRide || !user) return null;

  // Determine the other user ID for chat
  const otherUserId = isDriverMode 
    ? currentRide.driver?.id || ''  // If driver mode, chat with passenger
    : currentRide.driver?.id || ''; // If passenger mode, chat with driver

  return (
    <div className="min-h-screen bg-white">
      <RideMap />
      <RideDetails />
      
      <div className="p-6 bg-white">
        <FeedbackForm onSubmit={handleFeedbackSubmit} />
      </div>

      {otherUserId && (
        <ChatPanel rideId={currentRide.id} otherUserId={otherUserId} />
      )}
    </div>
  );
};

export default RideCompleted;
