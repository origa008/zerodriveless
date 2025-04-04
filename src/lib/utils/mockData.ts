
import { RideOption } from '@/lib/types';

// Mock ride options for the app
export const getMockRideOptions = (): RideOption[] => {
  return [
    {
      id: 'bike',
      name: 'Bike',
      description: 'Fast and affordable',
      image: '/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png',
      basePrice: 20,
      eta: '3 min',
    },
    {
      id: 'auto',
      name: 'Auto',
      description: 'Comfortable for 3 people',
      image: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png',
      basePrice: 35,
      eta: '5 min',
    }
  ];
};

// Mock ride history for wallet page
export const getMockRideHistory = () => {
  return [
    {
      id: 'ride-001',
      pickup: { name: 'Home', coordinates: [77.5946, 12.9716] },
      dropoff: { name: 'Office', coordinates: [77.6033, 12.9762] },
      rideOption: { id: 'bike', name: 'Bike', description: 'Fast and affordable', image: '/lovable-uploads/cfd3fd57-c24d-402a-9e79-91bdb781be21.png', basePrice: 20, eta: '3 min' },
      status: 'completed',
      price: 120,
      currency: 'RS',
      distance: 4.2,
      duration: 15,
      startTime: '2025-04-02T09:15:00',
      endTime: '2025-04-02T09:30:00',
      paymentMethod: 'wallet',
    },
    {
      id: 'ride-002',
      pickup: { name: 'Office', coordinates: [77.6033, 12.9762] },
      dropoff: { name: 'Mall', coordinates: [77.6113, 12.9279] },
      rideOption: { id: 'auto', name: 'Auto', description: 'Comfortable for 3 people', image: '/lovable-uploads/28c00f11-f954-45d1-94a5-4c5604aa633c.png', basePrice: 35, eta: '5 min' },
      status: 'completed',
      price: 180,
      currency: 'RS',
      distance: 5.8,
      duration: 22,
      startTime: '2025-04-01T18:30:00',
      endTime: '2025-04-01T18:52:00',
      paymentMethod: 'cash',
    }
  ];
};
