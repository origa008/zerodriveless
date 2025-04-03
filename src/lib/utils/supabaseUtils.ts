
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Profile, 
  Wallet, 
  Transaction, 
  Ride, 
  ChatMessage, 
  Location, 
  RideOption,
  PaymentMethod,
  DriverDetail
} from '../types';

// Profile functions
export const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

export const mapProfileToUser = (profile: Profile): User => {
  return {
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    avatar: profile.avatar || '',
    isLoggedIn: true,
    address: profile.address || '',
    isVerifiedDriver: profile.isVerifiedDriver || false,
    referralCode: profile.referralCode || '',
    referralEarnings: 0 // This would be calculated from transactions
  };
};

// Wallet functions
export const fetchWalletBalance = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching wallet:', error);
      return 0;
    }

    return data?.balance || 0;
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return 0;
  }
};

// Transaction functions
export const createTransaction = async (transaction: {
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'fare' | 'referral';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  paymentMethod: string;
  rideId?: string;
  bankDetails?: any;
}): Promise<boolean> => {
  try {
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
  } catch (error) {
    console.error('Error creating transaction:', error);
    return false;
  }
};

export const fetchTransactionHistory = async (userId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

// Ride functions
export const createRide = async (ride: {
  passenger_id: string;
  pickup_location: Location;
  dropoff_location: Location;
  ride_option: RideOption;
  price: number;
  distance: number;
  duration: number;
  currency: string;
  payment_method: PaymentMethod;
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .insert(ride)
      .select();

    if (error) {
      console.error('Error creating ride:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error creating ride:', error);
    return null;
  }
};

export const updateRideStatus = async (rideId: string, status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<boolean> => {
  try {
    const updateData: any = { status };
    
    // If updating to in_progress, set start_time
    if (status === 'in_progress') {
      updateData.start_time = new Date().toISOString();
    }
    
    // If updating to completed, set end_time
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
  } catch (error) {
    console.error('Error updating ride status:', error);
    return false;
  }
};

export const fetchRideHistory = async (userId: string, isDriver: boolean = false): Promise<Ride[]> => {
  try {
    const field = isDriver ? 'driver_id' : 'passenger_id';
    
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq(field, userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ride history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching ride history:', error);
    return [];
  }
};

// Chat functions
export const sendChatMessage = async (message: {
  ride_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chats')
      .insert(message);

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
};

export const fetchChatMessages = async (rideId: string, userId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('ride_id', rideId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const markChatAsRead = async (chatId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chats')
      .update({ is_read: true })
      .eq('id', chatId);

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
};

// Driver registration
export const submitDriverRegistration = async (userId: string, driverData: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('driver_details')
      .insert({
        user_id: userId,
        full_name: driverData.fullName,
        cnic_number: driverData.cnicNumber,
        vehicle_type: driverData.vehicleType || 'Bike',
        vehicle_registration_number: driverData.vehicleRegistrationNumber,
        status: 'pending'
      });

    if (error) {
      console.error('Error submitting driver registration:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error submitting driver registration:', error);
    return false;
  }
};

export const fetchDriverDetails = async (userId: string): Promise<DriverDetail | null> => {
  try {
    const { data, error } = await supabase
      .from('driver_details')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching driver details:', error);
      return null;
    }

    return data as DriverDetail;
  } catch (error) {
    console.error('Error fetching driver details:', error);
    return null;
  }
};
