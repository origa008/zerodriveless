import { supabase } from "@/integrations/supabase/client";
import { 
  Profile, User, Wallet, Transaction, Ride, 
  Driver, ChatMessage, DriverDetail, Location 
} from "../types";

// Convert Supabase profile data to our app's User type
export const mapProfileToUser = (profile: any): User => {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone || undefined,
    avatar: profile.avatar || undefined,
    address: profile.address || undefined,
    isLoggedIn: true,
    isVerifiedDriver: profile.is_verified_driver || false,
    referralCode: profile.referral_code || undefined,
    referralEarnings: 0, // This will be populated separately
  };
};

// Convert Supabase wallet data to our app's Wallet type
export const mapToWallet = (data: any): Wallet => {
  return {
    id: data.id,
    userId: data.user_id,
    balance: Number(data.balance),
    lastUpdated: new Date(data.last_updated),
  };
};

// Convert Supabase transaction data to our app's Transaction type
export const mapToTransaction = (data: any): Transaction => {
  return {
    id: data.id,
    userId: data.user_id,
    amount: Number(data.amount),
    type: data.type as 'deposit' | 'withdrawal' | 'fare' | 'referral',
    status: data.status as 'pending' | 'completed' | 'failed',
    description: data.description,
    paymentMethod: data.payment_method,
    rideId: data.ride_id,
    bankDetails: data.bank_details,
    createdAt: new Date(data.created_at),
  };
};

// Convert Supabase ride data to our app's Ride type
export const mapToRide = (data: any): Ride => {
  return {
    id: data.id,
    pickup: data.pickup_location as Location,
    dropoff: data.dropoff_location as Location,
    rideOption: data.ride_option,
    status: data.status,
    price: Number(data.price),
    currency: data.currency,
    distance: Number(data.distance),
    duration: Number(data.duration),
    startTime: data.start_time ? new Date(data.start_time) : undefined,
    endTime: data.end_time ? new Date(data.end_time) : undefined,
    paymentMethod: data.payment_method as 'cash' | 'wallet',
  };
};

// Convert Supabase chat data to our app's ChatMessage type
export const mapToChatMessage = (data: any): ChatMessage => {
  return {
    id: data.id,
    rideId: data.ride_id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    message: data.message,
    isRead: data.is_read,
    createdAt: new Date(data.created_at),
  };
};

// Convert Supabase driver_details data to our app's DriverDetail type
export const mapToDriverDetail = (data: any): DriverDetail => {
  return {
    id: data.id,
    userId: data.user_id,
    fullName: data.full_name,
    cnicNumber: data.cnic_number,
    driverLicenseNumber: data.driver_license_number,
    vehicleType: data.vehicle_type,
    vehicleModel: data.vehicle_model,
    vehicleColor: data.vehicle_color,
    vehicleRegistrationNumber: data.vehicle_registration_number,
    status: data.status,
    hasSufficientDeposit: data.has_sufficient_deposit,
    depositAmountRequired: Number(data.deposit_amount_required),
    approvalDate: data.approval_date ? new Date(data.approval_date) : undefined,
    createdAt: new Date(data.created_at),
  };
};

// Fetch user profile from Supabase
export const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
};

// Fetch wallet balance from Supabase
export const fetchWalletBalance = async (userId: string) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching wallet balance:', error);
    return 0;
  }
  
  return Number(data.balance);
};

// Update wallet balance in Supabase
export const updateWalletBalance = async (userId: string, amount: number) => {
  const { error } = await supabase.rpc('add_to_wallet', {
    user_id: userId,
    amount: amount
  });
  
  if (error) {
    console.error('Error updating wallet balance:', error);
    return false;
  }
  
  return true;
};

// Create a transaction record
export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      payment_method: transaction.paymentMethod,
      ride_id: transaction.rideId,
      bank_details: transaction.bankDetails
    });
  
  if (error) {
    console.error('Error creating transaction:', error);
    return false;
  }
  
  return true;
};

// Fetch user's rides
export const fetchUserRides = async (userId: string, isDriver: boolean) => {
  const column = isDriver ? 'driver_id' : 'passenger_id';
  
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rides:', error);
    return [];
  }
  
  return data.map(mapToRide);
};

// Create a ride in Supabase
export const createRide = async (ride: Omit<Ride, 'id'>, passengerId: string) => {
  const { data, error } = await supabase
    .from('rides')
    .insert({
      passenger_id: passengerId,
      pickup_location: ride.pickup,
      dropoff_location: ride.dropoff,
      ride_option: ride.rideOption,
      price: ride.price,
      distance: ride.distance,
      duration: ride.duration,
      currency: ride.currency,
      payment_method: ride.paymentMethod || 'cash',
      status: ride.status
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating ride:', error);
    return null;
  }
  
  return mapToRide(data);
};

// Update ride status in Supabase
export const updateRideStatus = async (rideId: string, status: string, driverId?: string) => {
  const updateData: any = { status };
  
  if (driverId && status === 'confirmed') {
    updateData.driver_id = driverId;
  }
  
  if (status === 'in_progress') {
    updateData.start_time = new Date().toISOString();
  }
  
  if (status === 'completed') {
    updateData.end_time = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('rides')
    .update(updateData)
    .eq('id', rideId);
  
  if (error) {
    console.error('Error updating ride status:', error);
    return false;
  }
  
  return true;
};

// Send a chat message
export const sendChatMessage = async (message: Omit<ChatMessage, 'id' | 'isRead' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      ride_id: message.rideId,
      sender_id: message.senderId,
      receiver_id: message.receiverId,
      message: message.message,
      is_read: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error sending message:', error);
    return null;
  }
  
  return mapToChatMessage(data);
};

// Fetch chat messages for a ride
export const fetchChatMessages = async (rideId: string) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
  
  return data.map(mapToChatMessage);
};

// Mark messages as read
export const markMessagesAsRead = async (rideId: string, receiverId: string) => {
  const { error } = await supabase
    .from('chats')
    .update({ is_read: true })
    .eq('ride_id', rideId)
    .eq('receiver_id', receiverId)
    .eq('is_read', false);
  
  if (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
  
  return true;
};

// Submit driver application
export const submitDriverApplication = async (driverDetails: DriverDocument, userId: string) => {
  const { error } = await supabase
    .from('driver_details')
    .insert({
      user_id: userId,
      full_name: driverDetails.fullName,
      cnic_number: driverDetails.cnicNumber,
      vehicle_type: 'car', // Default, can be updated with more options
      vehicle_registration_number: driverDetails.vehicleRegistrationNumber,
      status: 'pending',
      // Other fields can be populated when we implement file uploads
    });
  
  if (error) {
    console.error('Error submitting driver application:', error);
    return false;
  }
  
  return true;
};

// Fetch driver application status
export const fetchDriverApplication = async (userId: string) => {
  const { data, error } = await supabase
    .from('driver_details')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching driver application:', error);
    return null;
  }
  
  return data ? mapToDriverDetail(data) : null;
};
