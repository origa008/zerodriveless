-- Create enum for ride status
CREATE TYPE ride_status AS ENUM ('searching', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Create enum for vehicle types
CREATE TYPE vehicle_type AS ENUM ('car', 'bike', 'auto');

-- Create table for ride requests
CREATE TABLE IF NOT EXISTS ride_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    pickup_location JSONB NOT NULL,
    dropoff_location JSONB NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    vehicle_type vehicle_type NOT NULL,
    estimated_price DECIMAL(10,2) NOT NULL,
    estimated_distance DECIMAL(10,2) NOT NULL,
    estimated_duration INTEGER NOT NULL,
    status ride_status DEFAULT 'searching',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'pending'
);

-- Create index for searching nearby rides
CREATE INDEX ride_requests_location_idx ON ride_requests USING gist (
    ll_to_earth(pickup_lat, pickup_lng)
) WHERE status = 'searching';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ride_requests_updated_at
    BEFORE UPDATE ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to find nearby ride requests
CREATE OR REPLACE FUNCTION get_nearby_ride_requests(
    driver_lat DOUBLE PRECISION,
    driver_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    passenger_id UUID,
    pickup_location JSONB,
    dropoff_location JSONB,
    vehicle_type vehicle_type,
    estimated_price DECIMAL,
    estimated_distance DECIMAL,
    estimated_duration INTEGER,
    distance_to_pickup DOUBLE PRECISION,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.passenger_id,
        r.pickup_location,
        r.dropoff_location,
        r.vehicle_type,
        r.estimated_price,
        r.estimated_distance,
        r.estimated_duration,
        (earth_distance(
            ll_to_earth(driver_lat, driver_lng),
            ll_to_earth(r.pickup_lat, r.pickup_lng)
        ) / 1000) as distance_to_pickup,
        r.created_at
    FROM ride_requests r
    WHERE r.status = 'searching'
    AND earth_box(ll_to_earth(driver_lat, driver_lng), radius_km * 1000) @> ll_to_earth(r.pickup_lat, r.pickup_lng)
    AND earth_distance(
        ll_to_earth(driver_lat, driver_lng),
        ll_to_earth(r.pickup_lat, r.pickup_lng)
    ) < radius_km * 1000
    ORDER BY distance_to_pickup ASC;
END;
$$ LANGUAGE plpgsql; 