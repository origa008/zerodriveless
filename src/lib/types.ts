
export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isLoggedIn: boolean;
  address?: string;
  referralCode?: string;
  referralEarnings?: number;
  isRegisteredDriver?: boolean;
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
  paymentMethod?: 'cash' | 'wallet';
};

export type CommunityPost = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
};

export type DriverRegistrationStatus = 
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected';
