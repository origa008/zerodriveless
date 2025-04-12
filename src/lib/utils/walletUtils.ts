import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Ride } from '../types';

/**
 * Gets user wallet balance
 */
export const getWalletBalance = async (userId: string): Promise<{ balance: number; error: string | null }> => {
  try {
    console.log("Fetching wallet balance for user:", userId);
    
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Get wallet balance error:", error.message);
      throw error;
    }
    
    console.log("Wallet balance retrieved:", data?.balance || 0);
    return { balance: data?.balance || 0, error: null };
  } catch (error: any) {
    console.error("Get wallet balance error:", error.message);
    return { balance: 0, error: error.message };
  }
};

/**
 * Adds funds to user wallet
 */
export const addFundsToWallet = async (
  userId: string,
  amount: number,
  paymentMethod: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log(`Adding ${amount} to wallet for user ${userId}`);
    
    // First create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        type: 'deposit',
        status: 'completed',
        payment_method: paymentMethod,
        description: `Added ${amount} RS to wallet`
      });
    
    if (txError) {
      console.error("Transaction creation error:", txError);
      throw txError;
    }
    
    // Then update wallet balance
    const { error: walletError } = await supabase.rpc(
      'add_to_wallet',
      { user_id: userId, amount }
    );
    
    if (walletError) {
      console.error("Wallet update error:", walletError);
      throw walletError;
    }
    
    console.log(`Successfully added ${amount} to wallet for user ${userId}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Add funds error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Requests a withdrawal from user wallet
 */
export const requestWithdrawal = async (
  userId: string,
  amount: number,
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountTitle: string;
    phone: string;
  }
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log(`Requesting withdrawal of ${amount} for user ${userId}`);
    
    // First check if user has sufficient balance
    const { balance, error: balanceError } = await getWalletBalance(userId);
    
    if (balanceError) {
      throw new Error(balanceError);
    }
    
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Create withdrawal request transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: -amount, // negative amount for withdrawal
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal request of ${amount} RS`,
        bank_details: bankDetails
      });
    
    if (txError) {
      console.error("Transaction creation error:", txError);
      throw txError;
    }
    
    // Deduct from wallet balance
    const { error: walletError } = await supabase.rpc(
      'deduct_from_wallet',
      { user_id: userId, amount }
    );
    
    if (walletError) {
      console.error("Wallet update error:", walletError);
      throw walletError;
    }
    
    console.log(`Successfully processed withdrawal of ${amount} for user ${userId}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Withdrawal request error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Gets user transaction history
 */
export const getTransactionHistory = async (userId: string): Promise<{ 
  transactions: any[]; 
  error: string | null 
}> => {
  try {
    console.log(`Fetching transaction history for user ${userId}`);
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Get transaction history error:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} transactions for user ${userId}`);
    return { transactions: data || [], error: null };
  } catch (error: any) {
    console.error("Get transaction history error:", error.message);
    return { transactions: [], error: error.message };
  }
};

/**
 * Subscribes to real-time wallet balance updates
 */
export const subscribeToWalletBalance = (
  userId: string,
  callback: (balance: number) => void
) => {
  console.log(`Setting up wallet balance subscription for user ${userId}`);
  
  const channel = supabase
    .channel(`wallet:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log("Wallet balance updated:", payload);
        const updatedWallet = payload.new as any;
        callback(updatedWallet.balance);
      }
    )
    .subscribe();
  
  console.log("Wallet balance subscription set up successfully");
  return () => {
    console.log("Cleaning up wallet balance subscription");
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribes to real-time transaction updates
 */
export const subscribeToTransactions = (
  userId: string,
  callback: (transaction: any) => void
) => {
  console.log(`Setting up transactions subscription for user ${userId}`);
  
  const channel = supabase
    .channel(`transactions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log("New transaction received:", payload);
        callback(payload.new);
      }
    )
    .subscribe();
  
  console.log("Transactions subscription set up successfully");
  return () => {
    console.log("Cleaning up transactions subscription");
    supabase.removeChannel(channel);
  };
};

/**
 * Get deposit request status
 */
export const getDepositRequestStatus = async (userId: string): Promise<{
  pending: boolean;
  amount: number;
  createdAt: string | null;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('deposit_requests')
      .select('id, amount, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .maybeSingle();
    
    if (error) throw error;
    
    return {
      pending: !!data,
      amount: data?.amount || 0,
      createdAt: data?.created_at || null,
      error: null
    };
  } catch (error: any) {
    console.error("Get deposit request status error:", error.message);
    return { pending: false, amount: 0, createdAt: null, error: error.message };
  }
};

/**
 * Subscribe to ride updates
 */
export const subscribeToRideUpdates = (rideId: string, callback: (ride: Ride) => void) => {
  const channel = supabase
    .channel(`ride:${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`
      },
      (payload) => {
        callback(payload.new as Ride);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
