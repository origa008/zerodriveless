export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isLoggedIn: boolean;
  address?: string;
  isVerifiedDriver?: boolean;
  referralCode?: string;
  referralEarnings?: number;
  driverStatus?: string; // 'pending', 'approved', 'rejected'
  hasDriverDeposit?: boolean;
  rating?: number; // Add rating field for drivers
};

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface RideOption {
  id: string;
  name: string;
  image: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMinute: number;
  maxDistance?: number;
  description?: string;
}

export interface Driver {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  licensePlate?: string;
  vehicleType?: string;
}

export type PaymentMethod = 'cash' | 'wallet';

export type RideStatus = 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  pickup: Location;
  dropoff: Location;
  status: RideStatus;
  price: number;
  currency: string;
  distance: number;
  duration: number;
  paymentMethod: PaymentMethod;
  rideOption: RideOption;
  driver?: Driver;
  passenger?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  rideId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

export type DriverDocument = {
  fullName: string;
  phoneNumber: string;
  cnicNumber: string;
  vehicleType?: string;
  vehicleRegistrationNumber: string;
  cnicFrontPhoto?: File;
  cnicBackPhoto?: File;
  driverLicenseFrontPhoto?: File;
  driverLicenseBackPhoto?: File;
  vehicleRegistrationPhoto?: File;
  vehiclePhoto?: File;
  selfieWithCNIC?: File;
  selfiePhoto?: File;
  // Adding the missing properties
  vehicleModel?: string;
  vehicleColor?: string;
  driverLicenseNumber?: string;
  address?: string; // Added address field
  agreedToTerms?: boolean; // Added terms agreement field
};

export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'ride_payment' | 'ride_earning' | 'referral';
  status: 'pending' | 'completed' | 'cancelled';
  description?: string;
  createdAt: string;
  rideId?: string;
  paymentMethod?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountTitle: string;
    phone: string;
  };
};

export type Post = {
  id: string;
  author: {
    name: string;
    avatar?: string;
    time: string;
  };
  content: string;
  likes?: number;
  comments?: number;
};

export type ReferralInfo = {
  code: string;
  totalInvited: number;
  pending: number;
  completed: number;
  earned: number;
};

// Add DepositRequest type to match the database table
export type DepositRequest = {
  id: string;
  userId: string;
  amount: number;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  receiptUrl?: string;
  transactionReference?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
};
