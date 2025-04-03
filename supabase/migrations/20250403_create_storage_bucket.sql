
-- Create a storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create a policy to allow public access to view avatar files
BEGIN;
SELECT storage.create_storage_policy(
  'avatars',
  'anon',
  'SELECT',
  'true'
);
END;

-- Create a policy to allow authenticated users to upload avatar files
BEGIN;
SELECT storage.create_storage_policy(
  'avatars',
  'authenticated',
  'INSERT',
  'true'
);
END;

-- Create a policy to allow users to update their own avatar files
BEGIN;
SELECT storage.create_storage_policy(
  'avatars',
  'authenticated',
  'UPDATE',
  'true'
);
END;

-- Create a policy to allow users to delete their own avatar files
BEGIN;
SELECT storage.create_storage_policy(
  'avatars',
  'authenticated',
  'DELETE',
  'true'
);
END;
