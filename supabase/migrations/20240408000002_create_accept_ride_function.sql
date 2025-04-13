CREATE OR REPLACE FUNCTION public.accept_ride_request(
    p_ride_id UUID,
    p_driver_id UUID,
    p_driver_lat DECIMAL,
    p_driver_lng DECIMAL,
    p_vehicle_type TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ride record;
    v_result json;
BEGIN
    -- Lock the ride row for update
    SELECT *
    INTO v_ride
    FROM rides
    WHERE id = p_ride_id
    AND status = 'searching'
    AND driver_id IS NULL
    FOR UPDATE SKIP LOCKED;

    -- Check if ride exists and is available
    IF v_ride IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This ride is no longer available'
        );
    END IF;

    -- Verify vehicle type matches
    IF v_ride.vehicle_type != p_vehicle_type THEN
        RETURN json_build_object(
            'success', false,
            'error', format('This ride requires a %s vehicle', v_ride.vehicle_type)
        );
    END IF;

    -- Update ride with driver information
    UPDATE rides
    SET 
        driver_id = p_driver_id,
        status = 'confirmed',
        driver_location = ST_SetSRID(ST_MakePoint(p_driver_lng, p_driver_lat), 4326),
        updated_at = NOW()
    WHERE id = p_ride_id
    AND status = 'searching'
    AND driver_id IS NULL;

    -- Get updated ride details
    SELECT row_to_json(r.*)
    INTO v_result
    FROM rides r
    WHERE r.id = p_ride_id;

    RETURN json_build_object(
        'success', true,
        'data', v_result
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$; 