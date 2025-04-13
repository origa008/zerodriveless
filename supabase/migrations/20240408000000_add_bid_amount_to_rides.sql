-- Add bid_amount column to rides table
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS bid_amount DECIMAL(10,2);

-- Update the realtime publication to include the new column
ALTER PUBLICATION supabase_realtime REFRESH TABLE public.rides; 