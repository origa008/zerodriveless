
// Basic types for the ride application

export type Location = {
  name: string;
  address?: string;
  coordinates?: [number, number]; // [longitude, latitude]
};

export type RideOption = {
  id: string;
  name: string;
  type: string;
  image?: string;
  description?: string;
  basePrice: number;
};

export type PaymentMethod = 'cash' | 'wallet';

export type Ride = {
  id: string;
  pickup: Location;
  dropoff: Location;
  rideOption: RideOption;
  price: number;
  distance: number;
  duration: number;
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  paymentMethod: PaymentMethod;
  currency: string;
  driver?: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    licensePlate?: string;
  };
};

export type DriverDetails = {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  cnic_number: string;
  vehicle_type: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_registration_number: string;
  driver_license_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  has_sufficient_deposit: boolean;
  deposit_amount_required: number;
  current_location?: {
    x: number;
    y: number;
  };
  created_at: string;
  approval_date?: string;
};

// Create hook for location tracking
export interface LocationTrackingResult {
  isTracking: boolean;
  coordinates: [number, number] | null;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  updateLocation: (coords: GeolocationCoordinates) => void;
}
