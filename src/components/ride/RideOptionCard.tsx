
import React from 'react';
import { RideOption } from '@/lib/types';
import { MapPin, User, Users } from 'lucide-react';

interface RideOptionCardProps {
  option: RideOption;
  isSelected?: boolean;
  distance?: number;
  duration?: number;
  onSelect: (option: RideOption) => void;
  pickupLocation?: string;
  dropoffLocation?: string;
  price?: number;
  currency?: string;
}

const RideOptionCard: React.FC<RideOptionCardProps> = ({ 
  option, 
  isSelected = false, 
  distance,
  duration,
  onSelect,
  pickupLocation,
  dropoffLocation,
  price,
  currency
}) => {
  // Simple card to display ride option details
  if (pickupLocation && dropoffLocation) {
    // Driver view of ride request
    return (
      <div 
        className={`ride-option p-4 m-2 bg-white rounded-lg shadow-sm ${isSelected ? 'border-2 border-zerodrive-purple' : 'border border-gray-100'}`}
        onClick={() => onSelect(option)}
      >
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold mb-6">Ride Request</h3>
          
          <div className="flex items-start mb-3">
            <div className="mr-3 text-gray-400">
              <MapPin size={20} className="rotate-45" />
            </div>
            <div>
              <p className="text-lg">{pickupLocation}</p>
            </div>
          </div>
          
          <div className="flex items-start mb-6">
            <div className="mr-3 text-black">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-lg font-medium">{dropoffLocation}</p>
            </div>
          </div>
          
          <div className="flex justify-between mt-2">
            <div>
              <p className="text-gray-500">Distance</p>
              <p className="text-xl font-bold">{distance?.toFixed(1)} km</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Price</p>
              <p className="text-xl font-bold">{price} {currency}</p>
            </div>
          </div>
          
          <button 
            className="w-full bg-black text-white py-4 rounded-full text-lg font-medium mt-4"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(option);
            }}
          >
            Accept
          </button>
        </div>
      </div>
    );
  }

  // Regular ride option selection
  return (
    <div 
      className={`ride-option p-2 m-2 ${isSelected ? 'border-zerodrive-purple bg-zerodrive-purple/10' : ''}`}
      onClick={() => onSelect(option)}
    >
      <div className="flex items-center p-2">
        <div className="w-24 h-20 rounded-2xl overflow-hidden bg-zerodrive-purple/10 mr-4 flex items-center justify-center">
          <img 
            src={option.image} 
            alt={option.name} 
            className="h-16 object-contain"
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <h3 className="text-2xl font-medium">{option.name}</h3>
            <div className="text-right">
              <span className="text-2xl font-medium">{option.price}</span>
              <span className="text-sm text-gray-500">{option.currency}</span>
            </div>
          </div>
          <div className="flex items-center text-gray-500">
            <div className="flex items-center mr-6">
              <span className="text-lg">{duration ? `${Math.round(duration / 60)} min` : `${option.duration} min`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span className="text-lg">{option.capacity}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideOptionCard;
