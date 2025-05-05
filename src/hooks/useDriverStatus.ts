
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        
        // Check if user is registered as driver
        const { data: driverDetails, error: driverError } = await supabase
          .from('driver_details')
          .select('*')
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
        
        // Check deposit status
        let hasSufficientDeposit = driverDetails.has_sufficient_deposit;
        const depositRequired = driverDetails.deposit_amount_required || 3000;

        // If deposit field isn't reliable, check wallet directly
        if (isApproved && !hasSufficientDeposit) {
          console.log("Checking wallet balance for deposit requirement");
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();
            
          if (wallet) {
            console.log(`Wallet balance: ${wallet.balance}, required: ${depositRequired}`);
            hasSufficientDeposit = wallet.balance >= depositRequired;
            
            // Update the has_sufficient_deposit flag in driver_details if needed
            if (hasSufficientDeposit !== driverDetails.has_sufficient_deposit) {
              console.log(`Updating deposit status from ${driverDetails.has_sufficient_deposit} to ${hasSufficientDeposit}`);
              await supabase
                .from('driver_details')
                .update({ has_sufficient_deposit: hasSufficientDeposit })
                .eq('user_id', userId);
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
