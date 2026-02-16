-- Create profile-photos storage bucket
-- Run this in Supabase SQL Editor or via CLI

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,  -- Public bucket so profile photos are accessible
  5242880,  -- 5MB limit (matches validation in compressImage.ts)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']  -- Allowed types from compressImage.ts
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket

-- Policy 1: Anyone can view profile photos (public bucket)
CREATE POLICY "Public profile photos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Policy 2: Authenticated users can upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
