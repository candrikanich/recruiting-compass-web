-- Phase 3 GDPR deletion FK cleanup (audit finding, see
-- planning/audit-2026-07-27-findings.md, "SQL / Supabase" row for
-- server/api/cron/process-account-deletions.get.ts:139-149).
--
-- The account-deletion cron deletes public.users then auth.users, but a
-- set of FK constraints referencing users(id)/auth.users(id) default to
-- NO ACTION (the Postgres default when no ON DELETE clause is given) and
-- silently block both deletes with a foreign_key_violation. The cron
-- swallowed that error and reported success anyway (fixed separately in
-- the cron file) — this migration removes the underlying blockers.
--
-- Classification:
--   SET NULL — audit/attribution columns on rows that must survive the
--     user's deletion (who created/updated a shared record, an audit-log
--     "changed by", a point-in-time ownership snapshot). Three of these
--     columns are NOT NULL today; SET NULL requires dropping that
--     constraint first.
--   CASCADE — rows that are the deleted user's own data with no other
--     owner (device tokens, notification preferences, personal deadlines,
--     deadline alert log) or account_links.initiator_user_id, which is
--     always one of the row's own parent_user_id/player_user_id (both
--     already ON DELETE CASCADE) — matching its NOT NULL sibling columns
--     avoids a SET NULL vs. NOT NULL conflict and is a no-op in practice
--     since the row cascades away via parent_user_id/player_user_id first.
--
-- All changes are guarded (DROP CONSTRAINT IF EXISTS) so this migration
-- is safe to re-run.

-- ---------------------------------------------------------------------
-- SET NULL: audit/attribution columns (nullable already)
-- ---------------------------------------------------------------------

ALTER TABLE "public"."coaches" DROP CONSTRAINT IF EXISTS "coaches_created_by_fkey";
ALTER TABLE "public"."coaches"
  ADD CONSTRAINT "coaches_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."coaches" DROP CONSTRAINT IF EXISTS "coaches_updated_by_fkey";
ALTER TABLE "public"."coaches"
  ADD CONSTRAINT "coaches_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events" DROP CONSTRAINT IF EXISTS "events_created_by_fkey";
ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events" DROP CONSTRAINT IF EXISTS "events_updated_by_fkey";
ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."schools" DROP CONSTRAINT IF EXISTS "schools_created_by_fkey";
ALTER TABLE "public"."schools"
  ADD CONSTRAINT "schools_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."schools" DROP CONSTRAINT IF EXISTS "schools_updated_by_fkey";
ALTER TABLE "public"."schools"
  ADD CONSTRAINT "schools_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."interactions" DROP CONSTRAINT IF EXISTS "interactions_updated_by_fkey";
ALTER TABLE "public"."interactions"
  ADD CONSTRAINT "interactions_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- SET NULL: audit/attribution columns that are currently NOT NULL —
-- drop the NOT NULL constraint first so SET NULL can apply.
-- ---------------------------------------------------------------------

ALTER TABLE "public"."family_units" ALTER COLUMN "created_by_user_id" DROP NOT NULL;
ALTER TABLE "public"."family_units" DROP CONSTRAINT IF EXISTS "family_units_created_by_user_id_fkey";
ALTER TABLE "public"."family_units"
  ADD CONSTRAINT "family_units_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."data_ownership_snapshot" ALTER COLUMN "original_owner_id" DROP NOT NULL;
ALTER TABLE "public"."data_ownership_snapshot" DROP CONSTRAINT IF EXISTS "data_ownership_snapshot_original_owner_id_fkey";
ALTER TABLE "public"."data_ownership_snapshot"
  ADD CONSTRAINT "data_ownership_snapshot_original_owner_id_fkey"
  FOREIGN KEY ("original_owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."school_status_history" ALTER COLUMN "changed_by" DROP NOT NULL;
ALTER TABLE "public"."school_status_history" DROP CONSTRAINT IF EXISTS "school_status_history_changed_by_fkey";
ALTER TABLE "public"."school_status_history"
  ADD CONSTRAINT "school_status_history_changed_by_fkey"
  FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- CASCADE: the deleted user's own data, currently NO ACTION against
-- auth.users(id) — these block auth.admin.deleteUser() entirely.
-- ---------------------------------------------------------------------

ALTER TABLE "public"."device_tokens" DROP CONSTRAINT IF EXISTS "device_tokens_user_id_fkey";
ALTER TABLE "public"."device_tokens"
  ADD CONSTRAINT "device_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_user_id_fkey";
ALTER TABLE "public"."notification_preferences"
  ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."user_deadlines" DROP CONSTRAINT IF EXISTS "user_deadlines_user_id_fkey";
ALTER TABLE "public"."user_deadlines"
  ADD CONSTRAINT "user_deadlines_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."deadline_alert_log" DROP CONSTRAINT IF EXISTS "deadline_alert_log_user_id_fkey";
ALTER TABLE "public"."deadline_alert_log"
  ADD CONSTRAINT "deadline_alert_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- CASCADE: account_links.initiator_user_id is NOT NULL, so it cannot take
-- ON DELETE SET NULL. It always equals this row's parent_user_id or
-- player_user_id (both already ON DELETE CASCADE), so matching CASCADE
-- here is a no-op in the common case and removes the last NO ACTION FK
-- that could otherwise block a public.users delete.
-- ---------------------------------------------------------------------

ALTER TABLE "public"."account_links" DROP CONSTRAINT IF EXISTS "account_links_initiator_user_id_fkey";
ALTER TABLE "public"."account_links"
  ADD CONSTRAINT "account_links_initiator_user_id_fkey"
  FOREIGN KEY ("initiator_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
