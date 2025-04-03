
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import FeedbackForm from '@/components/ride/FeedbackForm';
import { CheckCircle } from 'lucide-react';

const RideCompleted: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRide, navigateToPage } = useRide();

  useEffect(() => {
    if (!currentRide || currentRide.status !== 'completed') {
      navigate('/');
    }
  }, [currentRide, navigate]);

  const handleFeedbackSubmit = (rating: number, comment: string) => {
    // Submit feedback to Supabase
    if (currentRide && user) {
      const ratedId = user.id === currentRide.driver?.id 
        ? currentRide.passenger?.id 
        : currentRide.driver?.id;
      
      if (ratedId) {
        supabase
          .from('ratings')
          .insert({
            ride_id: currentRide.id,
            rater_id: user.id,
            rated_id: ratedId,
            rating,
            comment
          })
          .then(({ error }) => {
            if (error) {
              console.error('Error submitting feedback:', error);
            }
          });
      }
    }
    
    // Navigate to home screen
    navigate('/');
  };

  const handleBookNewRide = () => {
    navigateToPage('/');
  };

  if (!currentRide || currentRide.status !== 'completed') {
    return null;
  }

  const isDriver = user?.id === currentRide.driver?.id;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-green-50 text-center py-8">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Ride Completed!</h2>
        <p className="text-green-700">
          {isDriver 
            ? `You've completed the ride and earned ${currentRide.price} ${currentRide.currency}`
            : `Your ride has been completed successfully!`
          }
        </p>
      </div>
      
      <RideMap />
      
      <div className="p-6 bg-white">
        <RideDetails showExtended={true} />
        
        <div className="mt-8 mb-6">
          <h3 className="text-xl font-medium mb-4">Rate your experience</h3>
          <FeedbackForm onSubmit={handleFeedbackSubmit} />
        </div>
        
        {!isDriver && (
          <Button
            className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl mt-6"
            onClick={handleBookNewRide}
          >
            Book Another Ride
          </Button>
        )}
        
        <Button
          variant="outline"
          className="w-full border-gray-300 py-6 text-xl rounded-xl mt-4"
          onClick={() => navigate('/')}
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default RideCompleted;
