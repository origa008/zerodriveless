
import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  readOnly?: boolean;
}

const LocationInput: React.FC<LocationInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  icon = <MapPin size={20} />,
  readOnly = false
}) => {
  return (
    <div className="flex items-center space-x-3 p-3 border-b border-gray-100">
      <div className="text-gray-400">
        {icon}
      </div>
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-lg focus:outline-none bg-transparent"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

export default LocationInput;
