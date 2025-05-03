
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useAuth } from '@/lib/context/AuthContext';

export function DriverLocation() {
  const { user } = useAuth();
  const { isTracking, error, coordinates, lastUpdated, retryTracking } = useLocationTracking();

  return (
    <div className="mb-4">
      <Button
        className={`flex items-center gap-2 ${error ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
        onClick={error ? retryTracking : undefined}
        variant={error ? "destructive" : "default"}
      >
        {isTracking ? (
          <>
            <MapPin className="h-4 w-4 text-green-300" />
            Tracking Location
          </>
        ) : error ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            {error.includes('permission') ? 'Enable Location' : 'Retry Location'}
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting Location...
          </>
        )}
      </Button>
      
      {isTracking && coordinates && (
        <div className="text-xs text-gray-500 mt-1">
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Unknown'}
        </div>
      )}
    </div>
  );
}
