
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

/**
 * Gets user wallet balance
 */
export const getWalletBalance = async (userId: string): Promise<{ balance: number; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
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
    
    if (txError) throw txError;
    
    // Then update wallet balance
    const { error: walletError } = await supabase.rpc(
      'add_to_wallet',
      { user_id: userId, amount }
    );
    
    if (walletError) throw walletError;
    
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
    // First check if user has sufficient balance
    const { balance, error: balanceError } = await getWalletBalance(userId);
    
    if (balanceError) throw new Error(balanceError);
    
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
    
    if (txError) throw txError;
    
    // Deduct from wallet balance
    const { error: walletError } = await supabase.rpc(
      'deduct_from_wallet',
      { user_id: userId, amount }
    );
    
    if (walletError) throw walletError;
    
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
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
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
        const updatedWallet = payload.new as any;
        callback(updatedWallet.balance);
      }
    )
    .subscribe();
    
  return () => {
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
        callback(payload.new);
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
