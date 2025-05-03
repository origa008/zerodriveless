
import React, { useEffect, useState } from 'react';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';

export const DriverLocation: React.FC = () => {
  const { isTracking, coordinates, error, startTracking } = useLocationTracking(true);
  const [locationName, setLocationName] = useState<string>('');
  
  useEffect(() => {
    if (coordinates) {
      // Try to reverse geocode the location for a human-readable address
      const [longitude, latitude] = coordinates;
      
      // Using a simple geocoding approach - in a real app you'd want to use
      // a proper geocoding service with caching
      try {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lon=${longitude}&lat=${latitude}&zoom=18&addressdetails=1`)
          .then(response => response.json())
          .then(data => {
            if (data && data.display_name) {
              // Simplify the location name
              const parts = data.display_name.split(',');
              if (parts.length >= 2) {
                setLocationName(`${parts[0]}, ${parts[1]}`);
              } else {
                setLocationName(data.display_name.substring(0, 30) + '...');
              }
            }
          })
          .catch(() => {
            // If geocoding fails, just show coordinates
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          });
      } catch (err) {
        console.error('Error geocoding location:', err);
        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    }
  }, [coordinates]);
  
  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-50 text-red-800 px-3 py-2 rounded-md border border-red-200">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }
  
  if (!coordinates) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-2 rounded-md border border-amber-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Locating you...</span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="bg-white flex items-center gap-1 text-green-800 pl-2">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-normal text-xs">Live</span>
      </Badge>
      
      <div className="flex items-center gap-1 text-sm">
        <MapPin className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-700 truncate max-w-[200px]">
          {locationName || 'Your location'}
        </span>
      </div>
    </div>
  );
};

export default DriverLocation;
