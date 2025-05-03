
import { RideOption } from '@/lib/types';

export const rideOptions: RideOption[] = [
  {
    id: '1',
    name: 'Car',
    type: 'sedan',
    description: 'Standard car, 4 seats',
    basePrice: 200,
    price: 250,
    currency: 'Rs',
    duration: 15,
    capacity: 4,
    eta: 5 // Changed from string to number
  },
  {
    id: '2',
    name: 'Bike',
    type: 'motorcycle',
    description: 'Fast & economical',
    basePrice: 100,
    price: 150,
    currency: 'Rs',
    duration: 10,
    capacity: 1,
    eta: 3  // Changed from string to number
  }
];
