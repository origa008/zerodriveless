import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
const RideProgress: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentRide,
    startRide,
    completeRide,
    cancelRide
  } = useRide();
  useEffect(() => {
    // Start the ride automatically when the page loads
    if (currentRide && currentRide.status === 'confirmed') {
      startRide();
    }
  }, [currentRide, startRide]);
  useEffect(() => {
    // If ride is completed, navigate to ride-completed
    if (currentRide && currentRide.status === 'completed') {
      navigate('/ride-completed');
    }
  }, [currentRide, navigate]);
  if (!currentRide) {
    navigate('/');
    return null;
  }
  const handleCancel = () => {
    cancelRide();
    navigate('/');
  };
  const handleComplete = () => {
    completeRide();
  };
  return <div className="min-h-screen bg-white">
      <RideMap />
      <RideDetails />
      
      <div className="p-6 bg-white">
        {currentRide.status === 'in_progress' ? <Button className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl" onClick={handleComplete}>
            Completed
          </Button> : <Button variant="outline" className="w-full border-gray-300 py-6 text-xl rounded-xl" onClick={handleCancel}>
            Cancel
          </Button>}
      </div>
    </div>;
};
export default RideProgress;