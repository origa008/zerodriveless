-- Enable full replication identity for rides table
ALTER TABLE public.rides REPLICA IDENTITY FULL;

-- Add rides table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- Add GIS extension for geospatial queries (if not already added)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add columns for geolocation to the rides table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'pickup_geolocation'
  ) THEN
    ALTER TABLE public.rides ADD COLUMN pickup_geolocation GEOGRAPHY(POINT);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'dropoff_geolocation'
  ) THEN
    ALTER TABLE public.rides ADD COLUMN dropoff_geolocation GEOGRAPHY(POINT);
  END IF;
END $$;

-- Create function to update geolocation points from JSON
CREATE OR REPLACE FUNCTION update_ride_geolocations()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract coordinates from pickup_location JSON and set pickup_geolocation
  IF NEW.pickup_location ? 'lat' AND NEW.pickup_location ? 'lng' THEN
    NEW.pickup_geolocation := ST_SetSRID(
      ST_MakePoint(
        (NEW.pickup_location->>'lng')::float, 
        (NEW.pickup_location->>'lat')::float
      ), 
      4326
    )::geography;
  END IF;
  
  -- Extract coordinates from dropoff_location JSON and set dropoff_geolocation
  IF NEW.dropoff_location ? 'lat' AND NEW.dropoff_location ? 'lng' THEN
    NEW.dropoff_geolocation := ST_SetSRID(
      ST_MakePoint(
        (NEW.dropoff_location->>'lng')::float, 
        (NEW.dropoff_location->>'lat')::float
      ), 
      4326
    )::geography;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geolocations when ride records are inserted or updated
DROP TRIGGER IF EXISTS update_ride_geolocations_trigger ON public.rides;
CREATE TRIGGER update_ride_geolocations_trigger
BEFORE INSERT OR UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION update_ride_geolocations();

-- Function to get nearby ride requests
CREATE OR REPLACE FUNCTION get_nearby_ride_requests(driver_lat float, driver_lng float, max_distance_km float DEFAULT 10)
RETURNS SETOF public.rides
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.rides
  WHERE 
    status = 'pending' AND
    driver_id IS NULL AND
    ST_DWithin(
      pickup_geolocation,
      ST_SetSRID(ST_MakePoint(driver_lng, driver_lat), 4326)::geography,
      max_distance_km * 1000
    )
  ORDER BY 
    ST_Distance(
      pickup_geolocation,
      ST_SetSRID(ST_MakePoint(driver_lng, driver_lat), 4326)::geography
    );
END;
$$;
