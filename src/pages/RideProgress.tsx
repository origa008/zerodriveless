
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';

const RideProgress: React.FC = () => {
  const {
    currentRide,
    startRide,
    completeRide,
    cancelRide,
    navigateToPage
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
      navigateToPage('/ride-completed');
    }
  }, [currentRide, navigateToPage]);

  if (!currentRide) {
    navigateToPage('/');
    return null;
  }

  const handleCancel = () => {
    cancelRide();
    navigateToPage('/');
  };

  const handleComplete = () => {
    completeRide();
  };

  // Vehicle images for display
  const vehicleImages = {
    Bike: '/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png',
    Auto: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png'
  };

  return (
    <div className="min-h-screen bg-white">
      <RideMap />
      
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        {/* Vehicle image */}
        <div className="mb-4 flex justify-center">
          {currentRide.rideOption.name === 'Bike' ? (
            <img 
              src={vehicleImages.Bike} 
              alt="Bike" 
              className="h-24 object-contain mx-auto"
            />
          ) : (
            <img 
              src={vehicleImages.Auto} 
              alt="Auto" 
              className="h-24 object-contain mx-auto"
            />
          )}
        </div>
        
        <RideDetails />
        
        <div className="p-6 bg-white">
          {currentRide.status === 'in_progress' ? (
            <Button 
              className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl" 
              onClick={handleComplete}
            >
              Completed
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-gray-300 py-6 text-xl rounded-xl" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideProgress;
