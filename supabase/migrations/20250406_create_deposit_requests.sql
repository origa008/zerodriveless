
-- Create table for deposit requests
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  bank_name TEXT NOT NULL,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  receipt_url TEXT,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own deposit requests
CREATE POLICY "Users can view their own deposit requests" 
ON public.deposit_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own deposit requests
CREATE POLICY "Users can create their own deposit requests" 
ON public.deposit_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a storage bucket for transaction receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction_receipts', 'transaction_receipts', true);

-- Create storage policies
BEGIN;
SELECT storage.create_storage_policy(
  'transaction_receipts',
  'anon',
  'SELECT',
  'true'
);
END;

BEGIN;
SELECT storage.create_storage_policy(
  'transaction_receipts',
  'authenticated',
  'INSERT',
  'true'
);
END;

-- Enable realtime for deposit_requests table
ALTER TABLE public.deposit_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
