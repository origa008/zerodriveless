// src/lib/types.ts

export interface Location {
  name: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  placeId?: string; // Add placeId property
}

export interface RideOption {
  id: string;
  name: string;
  image: string;
  price: number;
  currency: string;
  duration: number;
  capacity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isLoggedIn: boolean;
  phone?: string;
  address?: string;
  isVerifiedDriver?: boolean;
  referralCode?: string;
  referralEarnings?: number;
}

export interface Driver {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  licensePlate?: string;
  phone?: string;
}

export interface Passenger {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  phone?: string;
}

export type RideStatus = 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'wallet';

export interface Ride {
  id: string;
  pickup: Location;
  dropoff: Location;
  rideOption: RideOption;
  driver?: Driver;
  passenger?: Passenger;
  status: RideStatus;
  price: number;
  currency: string;
  distance: number;
  duration: number;
  startTime?: Date;
  endTime?: Date;
  paymentMethod?: PaymentMethod;
}

export interface DriverDocument {
  fullName: string;
  phoneNumber: string;
  cnicNumber: string;
  cnicFrontPhoto?: File | string;
  cnicBackPhoto?: File | string;
  driverLicenseNumber?: string;
  driverLicenseFrontPhoto?: File | string;
  driverLicenseBackPhoto?: File | string;
  vehicleRegistrationNumber: string;
  vehicleRegistrationPhoto?: File | string;
  vehiclePhoto?: File | string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  selfieWithCNIC?: File | string;
  selfiePhoto?: File | string;
}

export interface RideParams {
  pickupLocation: Location;
  dropoffLocation: Location;
  rideOption: RideOption;
  distance: number;
  duration: number;
}

export interface Post {
  id: string;
  content: string;
  author: User;
  likes: number;
  comments: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  createdAt: Date;
}

export interface Rating {
  id: string;
  rideId: string;
  rater: User;
  rated: User;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'ride_payment' | 'ride_earning' | 'refund' | 'referral';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  rideId?: string;
  paymentMethod?: string;
  bankDetails?: any;
  createdAt: Date;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountTitle: string;
}

export interface WithdrawalRequest {
  amount: number;
  bankAccount: BankAccount;
  status: 'pending' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
}
