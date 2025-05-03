-- Enable Row Level Security on the driver_details table
ALTER TABLE driver_details ENABLE ROW LEVEL SECURITY;

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
