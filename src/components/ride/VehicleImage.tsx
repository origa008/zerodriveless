
import React from 'react';

interface VehicleImageProps {
  vehicleType: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const VehicleImage: React.FC<VehicleImageProps> = ({ vehicleType, className = "", size = 'medium' }) => {
  const getImagePath = () => {
    const type = vehicleType.toLowerCase();
    
    if (type.includes('bike')) {
      return "/lovable-uploads/b0c8ef68-391d-426a-831c-1baaecaa8ddb.png"; // Bike image
    }
    
    if (type.includes('auto') || type.includes('rickshaw')) {
      return "/lovable-uploads/546d2513-9d53-4ba5-b5ab-99557b3113c0.png"; // Auto image
    }
    
    // Default vehicle image
    return "/lovable-uploads/546d2513-9d53-4ba5-b5ab-99557b3113c0.png";
  };
  
  const sizeClass = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };
  
  return (
    <img 
      src={getImagePath()}
      alt={`${vehicleType} vehicle`}
      className={`${sizeClass[size]} object-contain ${className}`}
    />
  );
};

export default VehicleImage;
