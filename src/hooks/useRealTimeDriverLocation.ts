
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { updateDriverLocation } from '@/lib/utils/driverLocation';

/**
 * Hook to track and update driver location in real-time
 * @param updateIntervalMs - How often to update location in milliseconds
 * @returns Location tracking state and controls
 */
export function useRealTimeDriverLocation(updateIntervalMs: number = 5000) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Use refs to store interval IDs to avoid recreating effects
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<number | null>(null);
  
  // Handle successful position update
  const handlePositionSuccess = async (position: GeolocationPosition) => {
    try {
      const { longitude, latitude } = position.coords;
      const coords: [number, number] = [longitude, latitude];
      
      console.log(`Location updated: [${longitude}, ${latitude}]`);
      setCoordinates(coords);
      setError(null);
      setLastUpdateTime(new Date());
      
      // Update location in database if user is logged in
      if (user?.id) {
        await updateDriverLocation(user.id, coords);
      }
    } catch (err) {
      console.error('Error processing location update:', err);
      setError('Failed to process location update');
    }
  };
  
  // Handle position errors
  const handlePositionError = (err: GeolocationPositionError) => {
    let message = 'Unknown location error';
    
    switch (err.code) {
      case 1:
        message = 'Location access denied. Please enable location permissions in your browser settings.';
        break;
      case 2:
        message = 'Location unavailable. Please check your device GPS or network connection.';
        break;
      case 3:
        message = 'Location request timed out. Please try again.';
        break;
    }
    
    console.error(`Location error (${err.code}): ${message}`);
    setError(message);
  };
  
  // Start tracking location
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    // Clear any existing trackers first
    stopTracking();
    
    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true }
    );
    
    // Set up continuous watching
    const watchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
    
    watchIdRef.current = watchId;
    
    // Set up a regular interval to force updates
    // This helps ensure we're updating regularly even if the device doesn't report frequent position changes
    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePositionSuccess,
        () => {}, // Silent error handling for interval updates
        { enableHighAccuracy: true }
      );
    }, updateIntervalMs);
    
    updateIntervalRef.current = intervalId;
    
    setIsTracking(true);
    console.log('Location tracking started');
  };
  
  // Stop tracking location
  const stopTracking = () => {
    // Clear watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Clear interval
    if (updateIntervalRef.current !== null) {
      window.clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    setIsTracking(false);
    console.log('Location tracking stopped');
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => stopTracking();
  }, []);
  
  return {
    coordinates,
    isTracking,
    error,
    lastUpdateTime,
    startTracking,
    stopTracking
  };
}

export default useRealTimeDriverLocation;
