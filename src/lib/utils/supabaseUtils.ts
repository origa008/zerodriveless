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
  DriverDetail,
  Driver
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

    // Convert Supabase response to Profile type
    if (data) {
      return {
        id: data.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        avatar: data.avatar || '',
        address: data.address || '',
        isVerifiedDriver: data.is_verified_driver || false,
        referralCode: data.referral_code || '',
        createdAt: new Date(data.created_at)
      };
    }

    return null;
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

// Add function to update wallet balance
export const updateWalletBalance = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc(
      amount >= 0 ? 'add_to_wallet' : 'deduct_from_wallet',
      { 
        user_id: userId, 
        amount: Math.abs(amount) 
      }
    );

    if (error) {
      console.error('Error updating wallet:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating wallet:', error);
    return false;
  }
};

// Transaction functions
export const createTransaction = async (transaction: {
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'fare' | 'referral';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  paymentMethod?: string;
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
        payment_method: transaction.paymentMethod || 'cash',
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

    return data ? data.map(item => ({
      id: item.id,
      userId: item.user_id,
      amount: item.amount,
      type: item.type as 'deposit' | 'withdrawal' | 'fare' | 'referral',
      status: item.status as 'pending' | 'completed' | 'failed',
      description: item.description || '',
      paymentMethod: item.payment_method || 'cash',
      rideId: item.ride_id,
      bankDetails: item.bank_details,
      createdAt: new Date(item.created_at)
    })) : [];
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
}): Promise<Ride | null> => {
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
      const rideData = data[0];
      return {
        id: rideData.id,
        pickup: rideData.pickup_location as Location,
        dropoff: rideData.dropoff_location as Location,
        rideOption: rideData.ride_option as RideOption,
        driver: rideData.driver_id ? {
          id: rideData.driver_id,
          name: 'Driver',
          rating: 4.5,
          licensePlate: 'Unknown',
          avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
        } : undefined,
        status: rideData.status as 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
        price: rideData.price,
        currency: rideData.currency,
        distance: rideData.distance,
        duration: rideData.duration,
        startTime: rideData.start_time ? new Date(rideData.start_time) : undefined,
        endTime: rideData.end_time ? new Date(rideData.end_time) : undefined,
        paymentMethod: rideData.payment_method as PaymentMethod
      };
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

/**
 * Fetch user's rides
 */
export const fetchUserRides = async (userId: string): Promise<Ride[]> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user rides:', error);
      return [];
    }

    // Transform the data to match the Ride type
    return data.map((ride) => ({
      id: ride.id,
      pickup: ride.pickup_location as Location,
      dropoff: ride.dropoff_location as Location,
      rideOption: ride.ride_option as RideOption,
      driver: ride.driver_id ? {
        id: ride.driver_id,
        name: 'Driver',
        rating: 4.5,
        licensePlate: 'Unknown',
        avatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
      } : undefined,
      status: ride.status as 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
      price: ride.price,
      currency: ride.currency || 'RS',
      distance: ride.distance,
      duration: ride.duration,
      startTime: ride.start_time ? new Date(ride.start_time) : undefined,
      endTime: ride.end_time ? new Date(ride.end_time) : undefined,
      paymentMethod: ride.payment_method as PaymentMethod || 'cash'
    }));
  } catch (error) {
    console.error('Error fetching user rides:', error);
    return [];
  }
};

// Chat functions
export const sendChatMessage = async (message: {
  ride_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read?: boolean;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chats')
      .insert({
        ride_id: message.ride_id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        message: message.message,
        is_read: message.is_read || false
      });

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

export const fetchChatMessages = async (rideId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data ? data.map(msg => ({
      id: msg.id,
      rideId: msg.ride_id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      message: msg.message,
      isRead: msg.is_read,
      createdAt: new Date(msg.created_at)
    })) : [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const markMessagesAsRead = async (rideId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chats')
      .update({ is_read: true })
      .eq('ride_id', rideId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
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

    if (data) {
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
        status: data.status as 'pending' | 'approved' | 'rejected',
        hasSufficientDeposit: data.has_sufficient_deposit,
        depositAmountRequired: data.deposit_amount_required,
        approvalDate: data.approval_date ? new Date(data.approval_date) : undefined,
        createdAt: new Date(data.created_at)
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching driver details:', error);
    return null;
  }
};

/**
 * Update user profile information
 */
export const updateUserProfile = async (userId: string, updates: Partial<Profile>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

/**
 * Upload driver document
 */
export const uploadDriverDocument = async (
  userId: string, 
  file: File, 
  documentType: 'cnic_front' | 'cnic_back' | 'license_front' | 'license_back' | 'vehicle_registration' | 'vehicle_photo' | 'selfie_with_cnic' | 'selfie_photo'
): Promise<{ success: boolean, url?: string }> => {
  try {
    const fileName = `${userId}_${documentType}_${Date.now()}`;
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${documentType}_${fileName}.${fileExt}`;
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('driver_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading document:', error);
      return { success: false };
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('driver_documents')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update driver details with the document URL
    const columnName = `${documentType}_url`;
    const { error: updateError } = await supabase
      .from('driver_details')
      .update({ [columnName]: publicUrl })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating driver details:', updateError);
      return { success: false };
    }

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false };
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });

    if (error) {
      console.error('Error resetting password:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Error updating password:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
};
