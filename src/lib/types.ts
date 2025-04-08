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
};

export type Location = {
  name: string;
  address?: string;
  placeId?: string;
  coordinates?: [number, number]; // [longitude, latitude]
};

export type RideOption = {
  id: string;
  name: string;
  image: string;
  description?: string; // Added description as optional property
  basePrice?: number;
  price?: number;
  currency?: string;
  duration?: number;
  capacity?: number;
  eta?: string;
};

export type Driver = {
  id: string;
  name: string;
  rating: number;
  licensePlate: string;
  avatar: string;
};

export type PaymentMethod = 'cash' | 'wallet';

export type Ride = {
  id: string;
  pickup: Location;
  dropoff: Location;
  rideOption: RideOption;
  driver?: Driver;
  status: "searching" | "confirmed" | "in_progress" | "completed" | "cancelled";
  price: number;
  currency: string;
  distance: number;
  duration: number;
  startTime?: string;
  endTime?: string;
  paymentMethod?: PaymentMethod;
};

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
  address?: string;
  agreedToTerms?: boolean;
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
