
import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
  
  // Safely get values with fallbacks
  const pickupName = ride.pickup?.name || 'Pickup Location';
  const dropoffName = ride.dropoff?.name || 'Dropoff Location';
  const priceValue = typeof ride.price === 'number' ? ride.price : 0;
  const currencySymbol = ride.currency || 'RS';
  const distance = typeof ride.distance === 'number' ? ride.distance.toFixed(1) : '0';
  
  return (
    <Card className="overflow-hidden bg-white shadow-sm border-0">
      <CardContent className="p-4">
        <h2 className="text-3xl font-bold mb-6">Ride Request</h2>
        <div className="border-t border-b py-4 mb-4">
          <div className="flex items-start mb-4">
            <div className="flex flex-col items-center mr-4">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-gray-500" />
              </div>
              <div className="w-0.5 h-10 bg-gray-200"></div>
            </div>
            <div>
              <p className="text-lg text-gray-500 font-normal">{pickupName}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium">{dropoffName}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-gray-500">Distance</p>
            <p className="text-2xl font-bold">{ride.distance_to_pickup ? `${ride.distance_to_pickup.toFixed(1)} km` : `${distance} km`}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Price</p>
            <p className="text-2xl font-bold">
              {priceValue} <span className="text-gray-500">{currencySymbol}</span>
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-0">
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full py-6 rounded-none bg-black hover:bg-gray-800 text-white text-xl font-medium"
        >
          {isAccepting ? (
            <>
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </>
          ) : 'Accept'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RideRequestItem;
