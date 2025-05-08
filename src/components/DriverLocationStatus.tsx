
import React from 'react';
import { AlertTriangle, MapPin, Loader2 } from 'lucide-react';
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700">Your Location</h3>
        {lastUpdateTime && (
          <span className="text-xs text-gray-500">
            Updated {formatDistanceToNow(lastUpdateTime, { addSuffix: true })}
          </span>
        )}
      </div>

      {error ? (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <p className="font-medium text-sm text-red-700">Location Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      ) : !coordinates ? (
        <div className="flex items-center justify-center py-4 gap-2 text-gray-500">
          {isTracking ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Getting your location...</span>
            </>
          ) : (
            <>
              <MapPin size={18} />
              <span className="text-sm">Location tracking off</span>
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-700">Location active</span>
          </div>
          <p className="text-xs text-gray-600">
            Coordinates: [{coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}]
          </p>
        </div>
      )}
    </div>
  );
};

export default DriverLocationStatus;
