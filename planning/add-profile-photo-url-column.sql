-- Add profile_photo_url column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.profile_photo_url IS 'Public URL to user profile photo stored in profile-photos bucket';

-- Create an index for faster lookups if needed in the future
CREATE INDEX IF NOT EXISTS idx_users_profile_photo_url
ON public.users(profile_photo_url)
WHERE profile_photo_url IS NOT NULL;
