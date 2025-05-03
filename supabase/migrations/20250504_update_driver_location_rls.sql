
-- Enable Row Level Security on the driver_details table (if not already enabled)
ALTER TABLE driver_details ENABLE ROW LEVEL SECURITY;

-- Create policy for drivers to update their own location
DROP POLICY IF EXISTS "Drivers can update their own location" ON driver_details;
CREATE POLICY "Drivers can update their own location" 
ON driver_details 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for drivers to view their own details
DROP POLICY IF EXISTS "Drivers can view their own details" ON driver_details;
CREATE POLICY "Drivers can view their own details" 
ON driver_details 
FOR SELECT 
USING (auth.uid() = user_id);
