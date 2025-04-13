import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import FeedbackForm from '@/components/ride/FeedbackForm';
import { updateRideStatus } from '@/lib/utils/rideUtils';

const RideCompleted: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRide, clearCurrentRide } = useRide();

  useEffect(() => {
    if (!currentRide || currentRide.status !== 'completed') {
      navigate('/');
      return;
    }

    // Update ride status to completed if not already
    const updateStatus = async () => {
      try {
        await updateRideStatus(currentRide.id, 'completed');
      } catch (error) {
        console.error('Error updating ride status:', error);
      }
    };

    updateStatus();
  }, [currentRide, navigate]);

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    try {
      // Here you would typically save the feedback to your database
      console.log('Feedback submitted:', { rating, comment });
      
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
        duration: 3000
      });

      // Clear the current ride and navigate home
      clearCurrentRide();
      navigate('/');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        duration: 3000
      });
    }
  };

  if (!currentRide || currentRide.status !== 'completed') {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <RideMap />
      <RideDetails />
      
      <div className="p-6 bg-white">
        <FeedbackForm onSubmit={handleFeedbackSubmit} />
      </div>
    </div>
  );
};

export default RideCompleted;