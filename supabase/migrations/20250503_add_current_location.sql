-- Add current_location column to driver_details table
ALTER TABLE driver_details
ADD COLUMN current_location GEOMETRY(POINT, 4326);

-- Create index for better query performance
CREATE INDEX idx_driver_details_current_location ON driver_details USING GIST (current_location);

-- Create policy for drivers to update their own location
CREATE POLICY "Drivers can update their own location"
ON driver_details
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy for drivers to view their own details
CREATE POLICY "Drivers can view their own details"
ON driver_details
FOR SELECT
USING (auth.uid() = user_id);
