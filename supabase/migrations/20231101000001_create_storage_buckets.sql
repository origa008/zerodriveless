
-- Create driver documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'Driver Documents',
  false,
  52428800, -- 50MB limit
  '{image/png,image/jpeg,image/jpg,application/pdf}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create avatar images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'avatars',
  'User Avatars',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- RLS policies for driver documents bucket
-- Allow users to upload their own documents
BEGIN;
  SELECT public.create_storage_policy(
    'driver-documents',
    'authenticated',
    'INSERT',
    'bucket_id = ''driver-documents'' AND (storage.foldername(name))[1] = auth.uid()::text'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy already exists';
END;

-- Allow users to read their own documents
BEGIN;
  SELECT public.create_storage_policy(
    'driver-documents',
    'authenticated',
    'SELECT',
    'bucket_id = ''driver-documents'' AND (storage.foldername(name))[1] = auth.uid()::text'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy already exists';
END;

-- RLS policies for avatars bucket
-- Allow anyone to read avatars
BEGIN;
  SELECT public.create_storage_policy(
    'avatars',
    'anon',
    'SELECT',
    'bucket_id = ''avatars'''
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy already exists';
END;

-- Allow authenticated users to upload their own avatars
BEGIN;
  SELECT public.create_storage_policy(
    'avatars',
    'authenticated',
    'INSERT',
    'bucket_id = ''avatars'' AND name = auth.uid()::text'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy already exists';
END;
