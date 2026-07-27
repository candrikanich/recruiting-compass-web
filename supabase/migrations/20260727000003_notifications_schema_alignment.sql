-- Phase 8 fix #2: align `notifications` table with the API surface that
-- server/api/notifications/create.post.ts and types/models.ts already assume.
--
-- 1. `notification_type` enum was missing 'offer' and 'event', which
--    types/models.ts::NotificationType and the notification_preferences
--    CHECK constraint already model as valid values. Inserting either value
--    into `notifications.type` previously failed with a Postgres enum error.
-- 2. `action_url` column referenced by the API/insert and by
--    types/models.ts::Notification did not exist on the table at all.

ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'offer';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'event';

ALTER TABLE "public"."notifications"
  ADD COLUMN IF NOT EXISTS "action_url" character varying(500);
