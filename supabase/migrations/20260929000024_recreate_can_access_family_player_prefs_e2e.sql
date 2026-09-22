-- can_access_family_player_prefs (20260821000010_family_shared_player_prefs_rls.sql)
-- is confirmed present on prod and QA, but missing entirely on the E2E
-- test project despite that original migration being marked applied in
-- E2E's own schema_migrations tracking table -- same class of orphaned
-- bookkeeping documented in claude/database.md's "E2E migration
-- reconciliation" section, exact cause not determined (dependency
-- get_user_family_ids() confirmed present, so it isn't a simple missing-
-- prerequisite case).
--
-- Impact confirmed E2E-only, not user-facing: get_athlete_status() (#966,
-- 20260929000002_get_athlete_status_authz.sql) calls this helper
-- unconditionally, so every GET /api/athlete/status call 500s
-- ("Failed to calculate athlete status") on the E2E project specifically --
-- surfaced as a dashboard page-health smoke failure. Prod/QA unaffected.
--
-- Fix: re-create the function verbatim (idempotent CREATE OR REPLACE, no
-- behavior change anywhere it already exists correctly).
CREATE OR REPLACE FUNCTION public.can_access_family_player_prefs(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members them
    WHERE them.user_id = target_user
      AND them.role = 'player'
      AND them.family_unit_id IN (SELECT family_unit_id FROM get_user_family_ids())
  );
$$;
