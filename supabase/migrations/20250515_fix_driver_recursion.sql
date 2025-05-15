
-- Create an RPC function to check driver eligibility
CREATE OR REPLACE FUNCTION public.get_driver_eligibility(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_record RECORD;
  result JSON;
BEGIN
  -- Get driver details
  SELECT status, has_sufficient_deposit, deposit_amount_required
  INTO driver_record
  FROM public.driver_details
  WHERE user_id = $1;
  
  -- If no record found
  IF driver_record IS NULL THEN
    result := json_build_object(
      'eligible', false,
      'reason', 'You need to register as a driver first',
      'redirect_to', '/official-driver'
    );
    RETURN result;
  END IF;
  
  -- If not approved
  IF driver_record.status <> 'approved' THEN
    result := json_build_object(
      'eligible', false,
      'reason', 'Your driver application is pending approval',
      'redirect_to', '/official-driver'
    );
    RETURN result;
  END IF;
  
  -- If not sufficient deposit
  IF NOT driver_record.has_sufficient_deposit THEN
    result := json_build_object(
      'eligible', false,
      'reason', 'You need to deposit at least ' || driver_record.deposit_amount_required || ' to your wallet',
      'redirect_to', '/wallet'
    );
    RETURN result;
  END IF;
  
  -- All checks passed
  result := json_build_object('eligible', true);
  RETURN result;
END;
$$;

-- Create function to update driver deposit status
CREATE OR REPLACE FUNCTION public.update_driver_deposit_status(driver_id UUID, has_deposit BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.driver_details
  SET has_sufficient_deposit = has_deposit
  WHERE user_id = driver_id;
  
  RETURN FOUND;
END;
$$;
