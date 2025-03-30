
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import FeedbackForm from '@/components/ride/FeedbackForm';

const RideCompleted: React.FC = () => {
  const navigate = useNavigate();
  const { currentRide } = useRide();

  if (!currentRide || currentRide.status !== 'completed') {
    navigate('/');
    return null;
  }

  const handleFeedbackSubmit = (rating: number, comment: string) => {
    console.log('Feedback submitted:', { rating, comment });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white">
      <RideMap />
      <RideDetails />
      
      <div className="p-6">
        <FeedbackForm onSubmit={handleFeedbackSubmit} />
      </div>
    </div>
  );
};

export default RideCompleted;
