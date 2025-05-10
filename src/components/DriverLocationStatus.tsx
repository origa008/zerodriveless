
import React from 'react';
import { MapPin, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DriverLocationStatusProps {
  coordinates: [number, number] | null;
  isTracking: boolean;
  error: string | null;
  lastUpdateTime: Date | null;
}

export const DriverLocationStatus: React.FC<DriverLocationStatusProps> = ({
  coordinates,
  isTracking,
  error,
  lastUpdateTime
}) => {
  return (
    <div className="p-3 bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1 text-gray-600" />
          <span className="text-sm font-medium">
            {isTracking ? 'Location tracking active' : 'Location tracking inactive'}
          </span>
        </div>
        
        <div className="flex items-center">
          {isTracking ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : coordinates ? (
        <p className="text-xs text-gray-500">
          Location tracking {lastUpdateTime 
            ? `updated ${formatDistanceToNow(lastUpdateTime, { addSuffix: true })}`
            : 'active'
          }
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Waiting for your location...
        </p>
      )}
    </div>
  );
};
