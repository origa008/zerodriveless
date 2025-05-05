
-- Function to update a driver's location
CREATE OR REPLACE FUNCTION public.update_driver_location(driver_id UUID, longitude FLOAT, latitude FLOAT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.driver_details
  SET current_location = jsonb_build_object(
    'type', 'Point',
    'coordinates', jsonb_build_array(longitude, latitude),
    'updated_at', now()
  )
  WHERE user_id = driver_id;
END;
$$;

-- Function to get a driver's location
CREATE OR REPLACE FUNCTION public.get_driver_location(driver_id UUID)
RETURNS FLOAT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  location_coords FLOAT[];
BEGIN
  SELECT 
    ARRAY[
      (current_location->>'coordinates')::jsonb->0, 
      (current_location->>'coordinates')::jsonb->1
    ]::FLOAT[]
  INTO location_coords
  FROM public.driver_details
  WHERE user_id = driver_id;
  
  RETURN location_coords;
END;
$$;

-- Function to get nearby drivers
CREATE OR REPLACE FUNCTION public.get_nearby_drivers(center_lng FLOAT, center_lat FLOAT, radius_km FLOAT)
RETURNS TABLE(user_id UUID, coordinates FLOAT[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.user_id,
    ARRAY[
      (d.current_location->>'coordinates')::jsonb->0, 
      (d.current_location->>'coordinates')::jsonb->1
    ]::FLOAT[] as coordinates
  FROM 
    public.driver_details d
  WHERE 
    d.current_location IS NOT NULL AND
    -- Approximate distance filtering (for performance)
    (d.current_location->>'coordinates')::jsonb->0 BETWEEN center_lng - (radius_km / 111.0) AND center_lng + (radius_km / 111.0) AND
    (d.current_location->>'coordinates')::jsonb->1 BETWEEN center_lat - (radius_km / 111.0) AND center_lat + (radius_km / 111.0) AND
    -- Calculate precise distance (Haversine formula in SQL)
    2 * 6371 * asin(sqrt(
      pow(sin(radians((d.current_location->>'coordinates')::jsonb->1 - center_lat) / 2), 2) +
      cos(radians(center_lat)) * cos(radians((d.current_location->>'coordinates')::jsonb->1)) *
      pow(sin(radians((d.current_location->>'coordinates')::jsonb->0 - center_lng) / 2), 2)
    )) <= radius_km;
END;
$$;
