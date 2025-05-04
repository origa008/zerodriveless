
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '@/lib/context/RideContext';
import { useToast } from '@/hooks/use-toast';
import RideMap from '@/components/map/RideMap';
import RideDetails from '@/components/ride/RideDetails';
import { Button } from '@/components/ui/button';
import { getRideDetails } from '@/lib/utils/dbFunctions';

const RideProgress: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRide, startRide, completeRide, cancelRide } = useRide();
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [rideData, setRideData] = useState<any>(null);

  useEffect(() => {
    // Verify a ride exists
    if (!currentRide) {
      navigate('/');
      return;
    }

    // Fetch the latest ride details
    const fetchRideData = async () => {
      setLoading(true);
      try {
        const { ride, error } = await getRideDetails(currentRide.id);
        
        if (error || !ride) {
          console.error("Error fetching ride details:", error);
          toast({
            title: "Error",
            description: "Could not load ride details",
            variant: "destructive"
          });
          return;
        }
        
        setRideData(ride);
        
        // Update ride status based on fetched data
        if (ride.status === 'in_progress') {
          setIsStarted(true);
        } else if (ride.status === 'completed') {
          setIsStarted(true);
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRideData();

    // Set up interval to periodically refresh ride data
    const interval = setInterval(fetchRideData, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentRide, navigate, toast]);

  const handleStartRide = async () => {
    if (!currentRide) return;
    
    try {
      const result = await startRide(currentRide.id);
      if (!result) {
        toast({
          title: "Error",
          description: "Failed to start the ride",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      setIsStarted(true);
      toast({
        title: "Ride Started",
        description: "Your ride has been started successfully",
        duration: 3000
      });
    } catch (error) {
      console.error("Error starting ride:", error);
      toast({
        title: "Error",
        description: "Failed to start the ride",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleCompleteRide = async () => {
    if (!currentRide) return;
    
    try {
      const result = await completeRide(currentRide.id);
      if (!result) {
        toast({
          title: "Error",
          description: "Failed to complete the ride",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      setIsCompleted(true);
      toast({
        title: "Ride Completed",
        description: "Your ride has been completed successfully",
        duration: 3000
      });
      
      // Navigate to the completed page
      navigate('/ride-completed');
    } catch (error) {
      console.error("Error completing ride:", error);
      toast({
        title: "Error",
        description: "Failed to complete the ride",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleCancelRide = async () => {
    if (!currentRide) return;
    
    try {
      const result = await cancelRide(currentRide.id, cancelReason);
      if (!result) {
        toast({
          title: "Error",
          description: "Failed to cancel the ride",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      toast({
        title: "Ride Cancelled",
        description: "Your ride has been cancelled",
        duration: 3000
      });
      
      // Navigate back to home
      navigate('/');
    } catch (error) {
      console.error("Error cancelling ride:", error);
      toast({
        title: "Error",
        description: "Failed to cancel the ride",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setShowCancelConfirm(false);
      setCancelReason('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Loading ride details...</p>
      </div>
    );
  }

  if (!currentRide) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <RideMap />
      <RideDetails />
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-between">
        {!isStarted ? (
          <Button 
            onClick={handleStartRide}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            Start Ride
          </Button>
        ) : !isCompleted ? (
          <Button 
            onClick={handleCompleteRide}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            Complete Ride
          </Button>
        ) : null}
        
        {!isCompleted && (
          <Button 
            onClick={() => setShowCancelConfirm(true)}
            variant="outline"
            className="ml-2 text-red-500 border-red-200"
          >
            Cancel
          </Button>
        )}
      </div>
      
      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-2">Cancel Ride</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to cancel this ride?</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                rows={3}
                placeholder="Please provide a reason for cancellation"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
              >
                No, Keep Ride
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelRide}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideProgress;
