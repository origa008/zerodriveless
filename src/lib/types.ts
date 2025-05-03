
// Basic types for the ride application

export type Location = {
  name: string;
  address?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  placeId?: string; // Added for LocationSearch component
};

export type RideOption = {
  id: string;
  name: string;
  type: string;
  image?: string;
  description?: string;
  basePrice: number;
  price?: number; // Added for RideOptionCard
  currency?: string; // Added for RideOptionCard
  duration?: number; // Added for RideOptionCard
  capacity?: number; // Added for RideOptionCard
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
  driver?: Driver;
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

// Additional types needed
export type DriverDocument = {
  id: string;
  type: string;
  file: File | null;
  preview: string | null;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  fileName?: string;
  uploadError?: string;
  
  // Fields needed for DriverRegistration
  fullName: string;
  phoneNumber: string;
  cnicNumber: string;
  vehicleType: string;
  vehicleRegistrationNumber: string;
  vehicleModel?: string;
  vehicleColor?: string;
  driverLicenseNumber?: string;
  address?: string;
  agreedToTerms: boolean;
  
  // Document fields
  cnicFrontPhoto?: File;
  cnicBackPhoto?: File;
  driverLicenseFrontPhoto?: File;
  driverLicenseBackPhoto?: File;
  vehicleRegistrationPhoto?: File;
  vehiclePhoto?: File;
  selfieWithCNIC?: File;
  selfiePhoto?: File;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  phone?: string;
  isDriver?: boolean;
  isLoggedIn?: boolean;
  address?: string;
};

export type Post = {
  id: string;
  content: string;
  author_id: string;
  author_email?: string;
  likes: number;
  comments: number;
  created_at: string;
};

export type DepositRequest = {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  account_title: string;
  account_number: string;
  bank_name: string;
  transaction_reference?: string;
  receipt_url?: string;
  created_at: string;
  processed_at?: string;
};

export type Driver = {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  licensePlate?: string;
};

export interface RideRequest {
  id: string;
  passenger_id: string;
  driver_id?: string | null;
  pickup_location: any;
  dropoff_location: any;
  ride_option: any;
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  currency: string;
  distance: number;
  duration: number;
  start_time?: string;
  end_time?: string;
  payment_method: string;
  created_at: string;
  bid_amount?: number;
  passenger?: any;
}
