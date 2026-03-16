-- Migration: invite expiry & decline
-- 1. Change default expiry from 7 days to 30 days
-- 2. Add declined_at column for tracking when an invite was declined

ALTER TABLE family_invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

ALTER TABLE family_invitations
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ NULL;
