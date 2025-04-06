
-- Reset default wallet balance to 0.00 for new users
ALTER TABLE public.wallets
ALTER COLUMN balance SET DEFAULT 0.00;

-- Add reset function to check driver deposit
CREATE OR REPLACE FUNCTION public.check_driver_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if the driver has sufficient deposit in wallet
  SELECT balance >= NEW.deposit_amount_required 
  INTO NEW.has_sufficient_deposit
  FROM public.wallets 
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create function to update wallet on deposit approval
CREATE OR REPLACE FUNCTION public.process_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If deposit is approved, add funds to user's wallet
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update wallet balance
    UPDATE public.wallets
    SET 
      balance = balance + NEW.amount,
      last_updated = now()
    WHERE 
      user_id = NEW.user_id;
      
    -- Create transaction record
    INSERT INTO public.transactions (
      user_id, 
      amount, 
      type, 
      status, 
      payment_method,
      description
    ) VALUES (
      NEW.user_id,
      NEW.amount,
      'deposit',
      'completed',
      'bank_transfer',
      'Deposit via ' || NEW.bank_name
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for deposit processing
DROP TRIGGER IF EXISTS on_deposit_status_update ON public.deposit_requests;
CREATE TRIGGER on_deposit_status_update
  AFTER UPDATE ON public.deposit_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION public.process_deposit();
