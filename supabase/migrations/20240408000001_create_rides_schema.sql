-- Create rides table with all required columns
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    driver_id UUID REFERENCES auth.users(id),
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    status TEXT CHECK (status IN ('searching', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'searching',
    bid_amount DECIMAL(10, 2),
    vehicle_type TEXT NOT NULL,
    estimated_distance DECIMAL(10, 2),
    estimated_duration INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own rides"
    ON public.rides FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = driver_id);

CREATE POLICY "Users can create ride requests"
    ON public.rides FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update rides they're assigned to"
    ON public.rides FOR UPDATE
    TO authenticated
    USING (auth.uid() = driver_id)
    WITH CHECK (auth.uid() = driver_id);

-- Set up realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS rides_pickup_location_idx 
    ON public.rides USING gist (
        ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)
    );

-- Create function to find nearby rides
CREATE OR REPLACE FUNCTION public.get_nearby_rides(
    driver_lat DECIMAL,
    driver_lng DECIMAL,
    max_distance_km DECIMAL DEFAULT 5
)
RETURNS SETOF rides
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT *
    FROM rides
    WHERE status = 'searching'
    AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326),
        ST_SetSRID(ST_MakePoint(driver_lng, driver_lat), 4326),
        max_distance_km * 1000  -- Convert km to meters
    )
    ORDER BY created_at DESC;
$$; 