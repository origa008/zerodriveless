
import React from 'react';
import { RideOption } from '@/lib/types';
import { User, Users } from 'lucide-react';

interface RideOptionCardProps {
  option: RideOption;
  isSelected?: boolean;
  distance?: number;
  duration?: number;
  onSelect: (option: RideOption) => void;
}

const RideOptionCard: React.FC<RideOptionCardProps> = ({ 
  option, 
  isSelected = false, 
  distance,
  duration,
  onSelect 
}) => {
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
