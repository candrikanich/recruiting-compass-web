-- Migration: Add Constraints to Users Table
-- Purpose: Prevent duplicate user records and improve data integrity
-- Date: 2026-01-25

-- Ensure email is unique (only one user per email)
ALTER TABLE public.users
ADD CONSTRAINT users_email_unique UNIQUE(email);

-- Log the change
COMMENT ON CONSTRAINT users_email_unique ON public.users IS
  'Prevents duplicate user records for same email address. Ensures each user can only have one profile regardless of how many times initialization runs.';

-- Add index for faster lookups by email (in case it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

COMMENT ON TABLE public.users IS
  'User profiles - each user has exactly one record matching their Supabase auth account. Email constraint prevents duplicates.';
