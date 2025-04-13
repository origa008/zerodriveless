import React, { useEffect, useState } from 'react';
import { useRide } from '@/lib/context/RideContext';
import { Clock, Navigation, DollarSign } from 'lucide-react';

interface RealTimeStats {
  currentDistance: number;
  currentDuration: number;
  currentFare: number;
  basePrice: number;
}

const calculateStats = (
  startLocation: { lat: number; lng: number },
  currentLocation: { lat: number; lng: number },
  basePrice: number,
  baseDistance: number,
  baseDuration: number
): RealTimeStats => {
  // Calculate actual distance using Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (currentLocation.lat - startLocation.lat) * Math.PI / 180;
  const dLon = (currentLocation.lng - startLocation.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(startLocation.lat * Math.PI / 180) * Math.cos(currentLocation.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  // Calculate duration in minutes
  const duration = (distance / baseDistance) * baseDuration;
  
  // Calculate fare based on distance ratio
  const distanceRatio = distance / baseDistance;
  const fare = basePrice * (distanceRatio >= 1 ? distanceRatio : 1);

  return {
    currentDistance: Number(distance.toFixed(2)),
    currentDuration: Math.round(duration),
    currentFare: Math.round(fare),
    basePrice
  };
};

const RealTimeStats: React.FC = () => {
  const { currentRide, driverLocation } = useRide();
  const [stats, setStats] = useState<RealTimeStats>({
    currentDistance: 0,
    currentDuration: 0,
    currentFare: currentRide?.price || 0,
    basePrice: currentRide?.price || 0
  });

  useEffect(() => {
    if (!currentRide || !driverLocation || currentRide.status !== 'in_progress') return;

    const startLocation = {
      lat: currentRide.pickup.latitude,
      lng: currentRide.pickup.longitude
    };

    const currentLoc = {
      lat: driverLocation.latitude,
      lng: driverLocation.longitude
    };

    const newStats = calculateStats(
      startLocation,
      currentLoc,
      currentRide.price,
      currentRide.distance,
      currentRide.duration
    );

    setStats(newStats);
  }, [currentRide, driverLocation]);

  if (!currentRide || currentRide.status !== 'in_progress') return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Real-Time Trip Stats</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <Navigation className="text-blue-500 mb-2" size={20} />
          <span className="text-sm text-gray-500">Distance</span>
          <span className="font-bold">{stats.currentDistance} km</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <Clock className="text-green-500 mb-2" size={20} />
          <span className="text-sm text-gray-500">Duration</span>
          <span className="font-bold">{stats.currentDuration} min</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <DollarSign className="text-amber-500 mb-2" size={20} />
          <span className="text-sm text-gray-500">Current Fare</span>
          <span className="font-bold">RS {stats.currentFare}</span>
        </div>
      </div>

      {stats.currentFare > stats.basePrice && (
        <p className="text-sm text-gray-500 mt-3">
          *Fare adjusted for longer distance than estimated
        </p>
      )}
    </div>
  );
};

export default RealTimeStats; 