
import { useState, useEffect } from 'react';
import { LocationTrackingResult } from '@/lib/types';
import { updateDriverLocation } from '@/lib/utils/driverLocation';
import { useAuth } from '@/lib/context/AuthContext';

export function useLocationTracking(
  autoStart: boolean = true, 
  updateInterval: number = 10000
): LocationTrackingResult {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // Function to update location in state and database
  const updateLocation = (position: GeolocationPosition) => {
    const { longitude, latitude } = position.coords;
    setCoordinates([longitude, latitude]);
    setError(null);
    
    // Update driver location in the database if user is logged in
    if (user?.id) {
      updateDriverLocation(user.id, [longitude, latitude])
        .catch(err => console.error('Error updating driver location:', err));
    }
  };
  
  // Function to handle location errors
  const handleLocationError = (err: GeolocationPositionError) => {
    let message = 'Unknown location error';
    
    switch (err.code) {
      case 1:
        message = 'Location access denied. Please enable location services in your browser settings.';
        break;
      case 2:
        message = 'Location unavailable. Please try again later.';
        break;
      case 3:
        message = 'Location request timed out. Please check your connection.';
        break;
    }
    
    console.error('Location error:', message);
    setError(message);
  };

  // Function to start tracking location
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    if (watchId !== null) {
      stopTracking(); // Clear any existing watchers
    }
    
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => updateLocation(position),
      handleLocationError,
      { enableHighAccuracy: true }
    );
    
    // Watch position regularly
    const id = navigator.geolocation.watchPosition(
      (position) => updateLocation(position),
      handleLocationError,
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 5000
      }
    );
    
    setWatchId(id);
    setIsTracking(true);
    
    // Also set up an interval to force regular updates
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => updateLocation(position),
        () => {}, // Silent error handling for interval updates
        { enableHighAccuracy: true }
      );
    }, updateInterval);
    
    // Save the interval ID for cleanup
    (window as any).locationUpdateInterval = intervalId;
  };
  
  // Function to stop tracking location
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    // Clear the update interval
    if ((window as any).locationUpdateInterval) {
      clearInterval((window as any).locationUpdateInterval);
      (window as any).locationUpdateInterval = null;
    }
    
    setIsTracking(false);
  };
  
  // Auto-start tracking if requested
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
    
    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [autoStart, user?.id]);
  
  return { 
    isTracking,
    coordinates,
    error,
    startTracking,
    stopTracking,
    updateLocation: (coords) => updateLocation(coords as any)
  };
}

export default useLocationTracking;
