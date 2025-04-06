
-- Create a storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver_documents', 'driver_documents', true);

-- Create a policy to allow public access to view documents
BEGIN;
SELECT storage.create_storage_policy(
  'driver_documents',
  'anon',
  'SELECT',
  'true'
);
END;

-- Create a policy to allow authenticated users to upload documents
BEGIN;
SELECT storage.create_storage_policy(
  'driver_documents',
  'authenticated',
  'INSERT',
  'true'
);
END;

-- Create a policy to allow users to update their documents
BEGIN;
SELECT storage.create_storage_policy(
  'driver_documents',
  'authenticated',
  'UPDATE',
  'true'
);
END;

-- Create a policy to allow users to delete their documents
BEGIN;
SELECT storage.create_storage_policy(
  'driver_documents',
  'authenticated',
  'DELETE',
  'true'
);
END;

-- Enable realtime tracking for driver_details
ALTER TABLE public.driver_details REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_details;
