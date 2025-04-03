
import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { searchPlaces, getPlaceDetails } from '@/lib/utils/mapsApi';
import { Location } from '@/lib/types';
import { Command } from '@/components/ui/command';

interface LocationSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: Location) => void;
  placeholder: string;
  icon?: React.ReactNode;
  readOnly?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  icon = <MapPin size={20} />,
  readOnly = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const fetchPlaces = async () => {
      if (inputValue && inputValue.length > 2 && !readOnly) {
        const results = await searchPlaces(inputValue);
        setSearchResults(results);
        setIsOpen(results.length > 0);
      } else {
        setSearchResults([]);
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(fetchPlaces, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, readOnly]);

  useEffect(() => {
    // Handle clicks outside search results
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectLocation = async (location: Location) => {
    setInputValue(location.name);
    onChange(location.name);
    
    if (location.placeId && !location.coordinates) {
      // Get details including coordinates
      const details = await getPlaceDetails(location.placeId);
      if (details) {
        onSelect(details);
      } else {
        onSelect(location);
      }
    } else {
      onSelect(location);
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-3 p-3 border-b border-gray-100">
        <div className="text-gray-400">
          {icon}
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => !readOnly && setIsOpen(searchResults.length > 0)}
            placeholder={placeholder}
            className="w-full text-lg focus:outline-none bg-transparent"
            readOnly={readOnly}
          />
        </div>
      </div>

      {isOpen && searchResults.length > 0 && (
        <div 
          ref={resultsRef}
          className="absolute z-20 left-0 right-0 mt-1 bg-white shadow-lg rounded-md overflow-hidden max-h-[300px] overflow-y-auto"
        >
          {searchResults.map((place, index) => (
            <div
              key={place.placeId || index}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelectLocation(place)}
            >
              <p className="font-medium">{place.name}</p>
              <p className="text-sm text-gray-500 truncate">{place.address}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
