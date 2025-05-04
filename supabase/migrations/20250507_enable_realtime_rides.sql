
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

-- Create an index for faster geospatial queries if using postgis
-- This is only needed if you're using the postgis extension
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE tablename = 'rides' 
      AND indexname = 'rides_pickup_geolocation_idx'
    ) AND EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'rides' 
      AND column_name = 'pickup_geolocation'
    ) THEN
      CREATE INDEX rides_pickup_geolocation_idx ON public.rides USING GIST (pickup_geolocation);
    END IF;
  END IF;
END $$;

-- Add RLS policies for rides table if not already set
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

  -- Add policy for passengers to view their own rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Passengers can view their own rides'
  ) THEN
    CREATE POLICY "Passengers can view their own rides" 
    ON public.rides 
    FOR SELECT 
    USING (auth.uid() = passenger_id);
  END IF;

  -- Add policy for passengers to insert their own rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Passengers can insert their own rides'
  ) THEN
    CREATE POLICY "Passengers can insert their own rides" 
    ON public.rides 
    FOR INSERT 
    WITH CHECK (auth.uid() = passenger_id);
  END IF;

  -- Add policy for passengers to update their own rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Passengers can update their own rides'
  ) THEN
    CREATE POLICY "Passengers can update their own rides" 
    ON public.rides 
    FOR UPDATE 
    USING (auth.uid() = passenger_id);
  END IF;

  -- Add policy for drivers to view rides assigned to them
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Drivers can view rides assigned to them'
  ) THEN
    CREATE POLICY "Drivers can view rides assigned to them" 
    ON public.rides 
    FOR SELECT 
    USING (auth.uid() = driver_id);
  END IF;

  -- Add policy for drivers to update their assigned rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Drivers can update their assigned rides'
  ) THEN
    CREATE POLICY "Drivers can update their assigned rides" 
    ON public.rides 
    FOR UPDATE 
    USING (auth.uid() = driver_id);
  END IF;

  -- Add policy to allow drivers to view available rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Drivers can view available rides'
  ) THEN
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
  END IF;

  -- Add policy to allow drivers to claim available rides
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'rides' 
    AND policyname = 'Drivers can claim available rides'
  ) THEN
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
  END IF;
END $$;
