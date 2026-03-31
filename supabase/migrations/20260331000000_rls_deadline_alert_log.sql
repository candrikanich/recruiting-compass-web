-- Enable RLS on deadline_alert_log
-- This table is written only by service_role (cron jobs, admin operations).
-- service_role bypasses RLS by default, so no policies are needed.
-- Enabling RLS without policies blocks anon and authenticated roles entirely,
-- which is the correct access model for an internal audit/log table.

ALTER TABLE "public"."deadline_alert_log" ENABLE ROW LEVEL SECURITY;
