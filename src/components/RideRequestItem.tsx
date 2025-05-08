
import React from 'react';
import { Clock, MapPin, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RideRequest } from '@/lib/types';

interface RideRequestItemProps {
  ride: RideRequest;
  isAccepting: boolean;
  onAccept: (ride: RideRequest) => Promise<void>;
}

export const RideRequestItem: React.FC<RideRequestItemProps> = ({
  ride,
  isAccepting,
  onAccept
}) => {
  const handleAccept = async () => {
    await onAccept(ride);
  };
  
  return (
    <Card className="overflow-hidden bg-white">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {ride.ride_option?.name || 'Standard'}
          </Badge>
          
          <div className="text-right">
            <p className="font-bold text-lg">
              {ride.price} {ride.currency || 'RS'}
            </p>
            <p className="text-gray-500 text-xs">
              {ride.distance?.toFixed(1) || '0'} km · {Math.round(ride.duration / 60) || '0'} min
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-2">
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex flex-col items-center mr-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="font-medium text-sm truncate">{ride.pickup?.name || 'Pickup Location'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dropoff</p>
                <p className="font-medium text-sm truncate">{ride.dropoff?.name || 'Dropoff Location'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3 text-xs text-gray-600">
          <span className="flex items-center">
            <Clock size={14} className="mr-1" />
            {Math.round(ride.duration / 60) || '0'} min
          </span>
          
          <span className="flex items-center">
            <MapPin size={14} className="mr-1" />
            {ride.distance_to_pickup?.toFixed(1) || '0'} km away
          </span>
          
          {ride.passenger && (
            <span className="flex items-center">
              <User size={14} className="mr-1" />
              {ride.passenger.name || "Passenger"}
            </span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="px-4 py-3 bg-gray-50/50">
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isAccepting ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Accepting...
            </>
          ) : 'Accept Ride'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RideRequestItem;
