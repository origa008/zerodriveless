
import React from 'react';
import { MapPin, AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  lastUpdateTime,
}) => {
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }
  
  if (!coordinates) {
    return (
      <div className="flex items-center gap-3 p-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[180px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </div>
    );
  }
  
  const getLocationUpdateStatus = () => {
    if (!lastUpdateTime) return 'Not updated yet';
    
    try {
      return `Updated ${formatDistanceToNow(lastUpdateTime, { addSuffix: true })}`;
    } catch (e) {
      return 'Recently updated';
    }
  };
  
  return (
    <div className="flex items-center gap-3 p-2">
      {isTracking ? (
        <div className="relative">
          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-green-600" />
          </div>
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      ) : (
        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
      )}
      
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">Your Location</span>
          <Badge variant="outline" className={`text-xs ${isTracking ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600'}`}>
            {isTracking ? 'Live' : 'Paused'}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">
          {isTracking ? getLocationUpdateStatus() : 'Location tracking is paused'}
        </p>
      </div>
    </div>
  );
};

export default DriverLocationStatus;
