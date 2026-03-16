-- Add soft-delete fields to support GDPR/CCPA compliant account deletion.
-- deletion_requested_at: set when user requests deletion; null means active account.
-- Hard delete is processed by cron after 30 days.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ NULL;
