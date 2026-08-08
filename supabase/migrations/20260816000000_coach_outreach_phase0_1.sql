-- Coach Outreach template library — Phase 0 + Phase 1 (schema only, no seed data).
--
-- Prepares the LIVE schema so docs/coach-outreach/template-library-seed.corrected.sql
-- can load. See docs/coach-outreach/migration-build-plan.md (§Phase 0, §Phase 1) and
-- schema-reconciliation.md for the why. No RLS access change to existing tables here.
--
-- Phase 0 — extend the EXISTING communication_templates feature (not a new table):
--   new columns (slug, stage, contact_window, required_variables, send_timing_note,
--   length_target, sort_order), widen the type CHECK to include 'social', add
--   value CHECKs + filter indexes + the slug partial-unique arbiter the seed upsert
--   needs; create the template_variables registry table.
-- Phase 1 — promote the athlete profile fields the templates auto-fill from the
--   user_preferences(category='player') jsonb blob into typed users columns, backfill,
--   and install an AFTER-write trigger that keeps the 5 jsonb-sourced columns in sync
--   so they never re-drift (the jsonb editor stays the write surface; these columns
--   become the resolver's typed read surface). The 4 duplicated fields
--   (gpa/graduation_year/sat_score/act_score) already have their own users columns and
--   their own writers — they get a column-wins one-time backfill only, no trigger, to
--   avoid clobbering a column edit with a staler jsonb value. Unifying THOSE write
--   paths is a follow-up (see build plan), out of scope here.
--
-- Enums are CHECK constraints, not PG enums (claude/database.md). New columns are
-- nullable. Fully idempotent — safe to re-run end to end.

-- ============================================================================
-- PHASE 0 — communication_templates + template_variables
-- ============================================================================

-- 0a. New columns (all nullable / defaulted).
ALTER TABLE public.communication_templates
  ADD COLUMN IF NOT EXISTS slug               text,
  ADD COLUMN IF NOT EXISTS stage              text,
  ADD COLUMN IF NOT EXISTS contact_window     text NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS required_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS send_timing_note   text,
  ADD COLUMN IF NOT EXISTS length_target      text,
  ADD COLUMN IF NOT EXISTS sort_order         integer NOT NULL DEFAULT 0;

-- 0b. Widen the existing type CHECK (email|message|phone_script) to allow social.
--     All existing rows are email/message/phone_script, so the new constraint
--     validates immediately.
ALTER TABLE public.communication_templates
  DROP CONSTRAINT IF EXISTS communication_templates_type_check;
ALTER TABLE public.communication_templates
  ADD CONSTRAINT communication_templates_type_check
  CHECK (type IN ('email','message','phone_script','social'));

-- 0c. Value CHECKs on the new enum-ish columns (existing rows conform:
--     contact_window defaulted to 'any', stage is NULL).
ALTER TABLE public.communication_templates
  DROP CONSTRAINT IF EXISTS communication_templates_contact_window_chk;
ALTER TABLE public.communication_templates
  ADD CONSTRAINT communication_templates_contact_window_chk
  CHECK (contact_window IN ('pre','post','any'));

ALTER TABLE public.communication_templates
  DROP CONSTRAINT IF EXISTS communication_templates_stage_chk;
ALTER TABLE public.communication_templates
  ADD CONSTRAINT communication_templates_stage_chk
  CHECK (stage IS NULL OR stage IN
    ('intro','update','event','post_event','thanks','nudge','reply','visit','status','decision','social'));

-- 0d. Slug arbiter for the seed upsert (partial: legacy predefined rows have no
--     slug and must not collide) + filter/order indexes the picker uses.
CREATE UNIQUE INDEX IF NOT EXISTS communication_templates_slug_key
  ON public.communication_templates (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS communication_templates_stage_window_idx
  ON public.communication_templates (stage, contact_window);
CREATE INDEX IF NOT EXISTS communication_templates_sort_idx
  ON public.communication_templates (sort_order);

-- 0e. Variable registry (global reference data — no user_id/family_unit_id).
CREATE TABLE IF NOT EXISTS public.template_variables (
  key                 text PRIMARY KEY,
  label               text NOT NULL,
  description         text,
  category            text NOT NULL,
  source_type         text NOT NULL,
  source_path         text,
  is_required_default boolean NOT NULL DEFAULT false,
  example             text,
  sort_order          integer NOT NULL DEFAULT 0,
  CONSTRAINT template_variables_source_type_chk
    CHECK (source_type IN ('column','computed','authored','system')),
  CONSTRAINT template_variables_category_chk
    CHECK (category IN ('player','academics','metrics','contacts','program','event','authored','system'))
);
CREATE INDEX IF NOT EXISTS template_variables_category_idx
  ON public.template_variables (category);

-- Registry is world-readable reference data for any signed-in user; writes are
-- service-role only (service_role bypasses RLS, so no write policy is defined).
ALTER TABLE public.template_variables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS template_variables_select_all ON public.template_variables;
CREATE POLICY template_variables_select_all
  ON public.template_variables FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PHASE 1 — promote athlete profile fields to typed users columns
-- ============================================================================

-- 1a. New nullable columns on users.
--     jersey_number + hometown_city/state have NO current source (not in the
--     jsonb either) — they exist for a future profile input; nothing backfills
--     them here. The other five are backfilled + trigger-synced from the
--     user_preferences 'player' jsonb below.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS jersey_number  text,
  ADD COLUMN IF NOT EXISTS height_inches  integer,
  ADD COLUMN IF NOT EXISTS weight_lbs     integer,
  ADD COLUMN IF NOT EXISTS high_school    text,
  ADD COLUMN IF NOT EXISTS club_team      text,
  ADD COLUMN IF NOT EXISTS dominant_side  text,
  ADD COLUMN IF NOT EXISTS hometown_city  text,
  ADD COLUMN IF NOT EXISTS hometown_state text;

-- 1b. One-time backfill from the 'player' jsonb.
--     For the five jsonb-sourced fields, jsonb is the source of truth (only the
--     jsonb editor writes them) — take the jsonb value where the column is still
--     NULL. Digit-guarded casts so a malformed value can never abort the migration.
UPDATE public.users u
SET
  height_inches = CASE WHEN u.height_inches IS NULL AND (p.data->>'height_inches') ~ '^\d+$'
                       THEN (p.data->>'height_inches')::int ELSE u.height_inches END,
  weight_lbs    = CASE WHEN u.weight_lbs IS NULL AND (p.data->>'weight_lbs') ~ '^\d+$'
                       THEN (p.data->>'weight_lbs')::int ELSE u.weight_lbs END,
  high_school   = COALESCE(u.high_school, NULLIF(p.data->>'high_school', '')),
  club_team     = COALESCE(u.club_team, NULLIF(p.data->>'club_team', ''), NULLIF(p.data->>'travel_team_name', '')),
  dominant_side = COALESCE(u.dominant_side, NULLIF(concat_ws('/', p.data->>'bats', p.data->>'throws'), ''))
FROM public.user_preferences p
WHERE p.user_id = u.id AND p.category = 'player';

-- 1c. Column-wins backfill of the DUPLICATED fields (jsonb AND users column both
--     exist today). Fill the column only where it is NULL — never overwrite an
--     existing column value with a possibly-staler jsonb one. No trigger for these
--     (they have their own column writers); unify those write paths as a follow-up.
UPDATE public.users u
SET
  graduation_year = CASE WHEN u.graduation_year IS NULL AND (p.data->>'graduation_year') ~ '^\d+$'
                         THEN (p.data->>'graduation_year')::int ELSE u.graduation_year END,
  gpa             = CASE WHEN u.gpa IS NULL AND (p.data->>'gpa') ~ '^\d+(\.\d+)?$'
                         THEN (p.data->>'gpa')::numeric ELSE u.gpa END,
  sat_score       = CASE WHEN u.sat_score IS NULL AND (p.data->>'sat_score') ~ '^\d+$'
                         THEN (p.data->>'sat_score')::int ELSE u.sat_score END,
  act_score       = CASE WHEN u.act_score IS NULL AND (p.data->>'act_score') ~ '^\d+$'
                         THEN (p.data->>'act_score')::int ELSE u.act_score END
FROM public.user_preferences p
WHERE p.user_id = u.id AND p.category = 'player';

-- 1d. Ongoing anti-drift sync: whenever a 'player' preferences row is written,
--     project the five jsonb-sourced fields into the typed users columns. Keeps
--     the resolver's read surface fresh without touching the profile UI. Only the
--     five jsonb-only fields are synced — the duplicated four are deliberately
--     excluded (see 1c). Never raises (digit-guarded casts), matching the
--     derive_family_unit_id() trigger's fail-open ethos.
CREATE OR REPLACE FUNCTION public.sync_player_prefs_to_users() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.category <> 'player' OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.users u
  SET
    height_inches = CASE WHEN (NEW.data->>'height_inches') ~ '^\d+$'
                         THEN (NEW.data->>'height_inches')::int ELSE u.height_inches END,
    weight_lbs    = CASE WHEN (NEW.data->>'weight_lbs') ~ '^\d+$'
                         THEN (NEW.data->>'weight_lbs')::int ELSE u.weight_lbs END,
    high_school   = CASE WHEN NEW.data ? 'high_school'
                         THEN NULLIF(NEW.data->>'high_school', '') ELSE u.high_school END,
    club_team     = CASE WHEN (NEW.data ? 'club_team') OR (NEW.data ? 'travel_team_name')
                         THEN COALESCE(NULLIF(NEW.data->>'club_team', ''), NULLIF(NEW.data->>'travel_team_name', ''))
                         ELSE u.club_team END,
    dominant_side = CASE WHEN (NEW.data ? 'bats') OR (NEW.data ? 'throws')
                         THEN NULLIF(concat_ws('/', NEW.data->>'bats', NEW.data->>'throws'), '')
                         ELSE u.dominant_side END
  WHERE u.id = NEW.user_id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_player_prefs_to_users() OWNER TO postgres;
-- PUBLIC inherits EXECUTE at CREATE regardless of a direct-role REVOKE; revoke
-- from PUBLIC explicitly (same gotcha as claude/database.md security-hardening).
-- Only ever invoked as a trigger (runs with table-owner privileges), so no
-- client role needs a grant restored.
REVOKE ALL ON FUNCTION public.sync_player_prefs_to_users() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_user_preferences_sync_player ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_sync_player
  AFTER INSERT OR UPDATE OF data, category ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.sync_player_prefs_to_users();

-- After apply: regenerate types — npx supabase gen types typescript > types/database.ts
