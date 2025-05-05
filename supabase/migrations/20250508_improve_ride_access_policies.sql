
-- Enable full replication identity for rides table (if not already set)
ALTER TABLE public.rides REPLICA IDENTITY FULL;

-- Add rides table to the realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;
END $$;

-- Ensure proper RLS policies for rides table
DO $$
BEGIN
  -- Check if RLS is enabled for rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'rides' 
    AND rowsecurity = true
  ) THEN
    -- Enable RLS
    ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Drop existing policies first to avoid conflicts
  DROP POLICY IF EXISTS "Drivers can view available rides" ON public.rides;
  DROP POLICY IF EXISTS "Drivers can claim available rides" ON public.rides;
  DROP POLICY IF EXISTS "Passengers can view their own rides" ON public.rides;
  DROP POLICY IF EXISTS "Drivers can view rides assigned to them" ON public.rides;

  -- Add policy for passengers to view their own rides
  CREATE POLICY "Passengers can view their own rides" 
  ON public.rides 
  FOR SELECT 
  USING (auth.uid() = passenger_id);

  -- Add policy for drivers to view available rides
  CREATE POLICY "Drivers can view available rides" 
  ON public.rides 
  FOR SELECT 
  USING (
    status = 'searching' AND 
    driver_id IS NULL AND
    EXISTS (
      SELECT 1
      FROM driver_details
      WHERE user_id = auth.uid()
      AND status = 'approved'
      AND has_sufficient_deposit = true
    )
  );

  -- Add policy for drivers to view rides assigned to them
  CREATE POLICY "Drivers can view rides assigned to them" 
  ON public.rides 
  FOR SELECT 
  USING (auth.uid() = driver_id);

  -- Add policy for drivers to claim available rides
  CREATE POLICY "Drivers can claim available rides" 
  ON public.rides 
  FOR UPDATE 
  USING (
    status = 'searching' AND 
    driver_id IS NULL AND
    EXISTS (
      SELECT 1
      FROM driver_details
      WHERE user_id = auth.uid()
      AND status = 'approved'
      AND has_sufficient_deposit = true
    )
  );
END $$;

-- Create index on pickup_location for faster queries if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'rides' 
    AND indexname = 'rides_status_idx'
  ) THEN
    CREATE INDEX rides_status_idx ON public.rides(status);
  END IF;
END $$;
