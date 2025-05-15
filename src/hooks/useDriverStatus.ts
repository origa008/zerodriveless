
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface DriverStatus {
  isRegistered: boolean;
  isPending: boolean;
  isApproved: boolean;
  hasSufficientDeposit: boolean;
  depositRequired: number;
  isLoading: boolean;
}

export function useDriverStatus(userId: string | undefined) {
  const [driverStatus, setDriverStatus] = useState<DriverStatus>({
    isRegistered: false,
    isPending: false,
    isApproved: false,
    hasSufficientDeposit: false,
    depositRequired: 3000,
    isLoading: true
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const checkDriverEligibility = async () => {
      try {
        console.log("Checking driver eligibility for user:", userId);
        
        // Simple direct query to avoid recursion
        const { data: driverDetails, error: driverError } = await supabase
          .from('driver_details')
          .select('status, has_sufficient_deposit, deposit_amount_required')
          .eq('user_id', userId)
          .maybeSingle();

        if (driverError) {
          console.error("Error checking driver status:", driverError);
          throw driverError;
        }

        // If not registered as driver
        if (!driverDetails) {
          console.log("User is not registered as a driver");
          setDriverStatus({
            isRegistered: false,
            isPending: false,
            isApproved: false,
            hasSufficientDeposit: false,
            depositRequired: 3000,
            isLoading: false
          });
          return;
        }

        console.log("Driver details found:", {
          status: driverDetails.status,
          depositRequired: driverDetails.deposit_amount_required,
          hasSufficientDeposit: driverDetails.has_sufficient_deposit
        });

        // User is registered, check approval status
        const isApproved = driverDetails.status === 'approved';
        
        // Use existing deposit status from database
        let hasSufficientDeposit = driverDetails.has_sufficient_deposit;
        const depositRequired = driverDetails.deposit_amount_required || 3000;
        
        // If approved and deposit status needs verification, check wallet directly
        if (isApproved) {
          console.log("Checking wallet balance for deposit requirement");
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();
            
          if (wallet) {
            console.log(`Wallet balance: ${wallet.balance}, required: ${depositRequired}`);
            const hasEnoughBalance = wallet.balance >= depositRequired;
            
            // Only update database if the status has changed
            if (hasEnoughBalance !== hasSufficientDeposit) {
              console.log(`Updating deposit status from ${hasSufficientDeposit} to ${hasEnoughBalance}`);
              
              // Update using client-side function to avoid RLS issues
              await supabase.rpc('update_driver_deposit_status', { 
                driver_id: userId, 
                has_deposit: hasEnoughBalance 
              }).catch(err => {
                console.log("RPC not available, using direct update:", err);
                
                // Fallback to direct update
                supabase
                  .from('driver_details')
                  .update({ has_sufficient_deposit: hasEnoughBalance })
                  .eq('user_id', userId);
              });
              
              hasSufficientDeposit = hasEnoughBalance;
            }
          }
        }

        // Set driver status
        setDriverStatus({
          isRegistered: true,
          isPending: driverDetails.status === 'pending',
          isApproved,
          hasSufficientDeposit,
          depositRequired,
          isLoading: false
        });
        
        console.log("Driver status updated:", {
          isRegistered: true,
          isPending: driverDetails.status === 'pending',
          isApproved,
          hasSufficientDeposit 
        });
        
      } catch (error) {
        console.error("Error checking driver eligibility:", error);
        toast({
          title: "Error",
          description: "Could not verify driver status",
          variant: "destructive"
        });
        setDriverStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkDriverEligibility();
  }, [userId, toast]);

  return driverStatus;
}
