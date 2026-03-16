-- Add date_of_birth to users table for COPPA age-gate enforcement.
-- Nullable: existing users are grandfathered in; required only for new signups.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL;

-- RLS: date_of_birth is readable only by the user themselves and family unit members.
-- The existing RLS policy for users already restricts row-level access;
-- no additional column-level policy is needed beyond the existing row policies.
