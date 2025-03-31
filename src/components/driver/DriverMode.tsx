
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRide } from '@/lib/context/RideContext';
import { Map, Users, Clock, DollarSign } from 'lucide-react';
import { Ride } from '@/lib/types';

const mockNearbyRequests: Partial<Ride>[] = [
  {
    id: 'req-1',
    pickup: {
      name: 'Gulberg III',
      address: 'Gulberg III, Lahore, Pakistan',
      coordinates: [74.3587, 31.5204]
    },
    dropoff: {
      name: 'Johar Town',
      address: 'Johar Town, Lahore, Pakistan',
      coordinates: [74.2973, 31.4697]
    },
    distance: 7.5,
    duration: 25,
    price: 150,
    currency: 'RS'
  },
  {
    id: 'req-2',
    pickup: {
      name: 'Bahria Town',
      address: 'Bahria Town, Lahore, Pakistan',
      coordinates: [74.2418, 31.3684]
    },
    dropoff: {
      name: 'DHA Phase 5',
      address: 'DHA Phase 5, Lahore, Pakistan',
      coordinates: [74.4107, 31.4794]
    },
    distance: 12.8,
    duration: 35,
    price: 240,
    currency: 'RS'
  }
];

interface DriverModeProps {
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;
}

const DriverMode: React.FC<DriverModeProps> = ({ isOnline, setIsOnline }) => {
  const navigate = useNavigate();
  const { setCurrentRide } = useRide();
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Partial<Ride> | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);

  const handleGoOnline = () => {
    setIsOnline(true);
  };

  const handleGoOffline = () => {
    setIsOnline(false);
  };

  const handleShowBid = (ride: Partial<Ride>) => {
    setSelectedRide(ride);
    setBidAmount(ride.price || 0);
    setShowBidModal(true);
  };

  const handleAcceptRide = () => {
    if (selectedRide) {
      const ride = {
        ...selectedRide,
        status: 'confirmed',
        price: bidAmount,
        rideOption: {
          id: '1',
          name: 'Bike',
          image: '/lovable-uploads/e30d2010-d04d-4e54-b564-033da8613f0b.png',
          price: bidAmount,
          currency: 'RS',
          duration: selectedRide.duration || 0,
          capacity: 4
        },
        driver: {
          id: '1',
          name: 'John Smith',
          rating: 4.8,
          licensePlate: 'ABC-123',
          avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
        }
      } as Ride;
      
      setCurrentRide(ride);
      setShowBidModal(false);
      navigate('/ride-progress');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-medium mb-4">Driver Mode</h2>
      
      {!isOnline ? (
        <div>
          <p className="text-gray-600 mb-6">You are currently offline. Go online to receive ride requests.</p>
          
          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl"
            onClick={handleGoOnline}
          >
            Go Online
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-green-600 font-medium">You are online</p>
            <Button 
              variant="outline" 
              className="border-gray-300"
              onClick={handleGoOffline}
            >
              Go Offline
            </Button>
          </div>
          
          <h3 className="text-xl font-medium mb-3">Nearby Requests</h3>
          <div className="space-y-4">
            {mockNearbyRequests.map((request) => (
              <div 
                key={request.id} 
                className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
              >
                <div className="flex justify-between mb-3">
                  <div className="flex items-center">
                    <Map className="text-gray-500 mr-2" size={16} />
                    <p className="font-medium">{request.pickup?.name} → {request.dropoff?.name}</p>
                  </div>
                  <p className="font-bold">{request.price} {request.currency}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Map className="mr-1" size={14} />
                    <span>{request.distance} km</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1" size={14} />
                    <span>{request.duration} min</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="mr-1" size={14} />
                    <span>~{Math.round(Number(request.price) * 0.9)} profit</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={() => handleShowBid(request)}
                >
                  Place Bid
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bid Modal */}
      {showBidModal && selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Place Your Bid</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">Route: {selectedRide.pickup?.name} → {selectedRide.dropoff?.name}</p>
              <p className="text-gray-600 mb-2">Distance: {selectedRide.distance} km</p>
              <p className="text-gray-600 mb-2">Base fare: {Math.round(selectedRide.distance! * 9)} RS</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Your Bid (RS)</label>
              <input
                type="number"
                min={Math.round(selectedRide.distance! * 9)}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3"
              />
              <p className="text-sm text-gray-500 mt-1">Minimum bid: {Math.round(selectedRide.distance! * 9)} RS</p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowBidModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-black text-white"
                onClick={handleAcceptRide}
              >
                Accept Ride
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverMode;
