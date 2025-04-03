
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
};

export type Location = {
  name: string;
  address: string;
  placeId?: string;
  coordinates?: [number, number]; // [longitude, latitude]
};

export type RideOption = {
  id: string;
  name: string;
  image: string;
  price: number;
  currency: string;
  duration: number;
  capacity: number;
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
  startTime?: Date;
  endTime?: Date;
  paymentMethod?: PaymentMethod;
};

export type DriverDocument = {
  fullName: string;
  phoneNumber: string;
  cnicNumber: string;
  cnicFrontPhoto?: File;
  cnicBackPhoto?: File;
  driverLicenseFrontPhoto?: File;
  driverLicenseBackPhoto?: File;
  vehicleRegistrationNumber: string;
  vehicleRegistrationPhoto?: File;
  vehiclePhoto?: File;
  selfieWithCNIC?: File;
  selfiePhoto?: File;
  vehicleType?: string;
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

export type ChatMessage = {
  id: string;
  rideId: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  address?: string;
  isVerifiedDriver: boolean;
  referralCode?: string;
  createdAt: Date;
};

export type Wallet = {
  id: string;
  userId: string;
  balance: number;
  lastUpdated: Date;
};

export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'fare' | 'referral';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  paymentMethod?: string;
  rideId?: string;
  bankDetails?: any;
  createdAt: Date;
};

export type DriverDetail = {
  id: string;
  userId: string;
  fullName: string;
  cnicNumber: string;
  driverLicenseNumber?: string;
  vehicleType: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleRegistrationNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  hasSufficientDeposit: boolean;
  depositAmountRequired: number;
  approvalDate?: Date;
  createdAt: Date;
};
