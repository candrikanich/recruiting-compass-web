-- Phase 10a: consolidate legacy account_links-era RLS policies where a
-- family_unit_id/family_members-era policy already covers the same verb
-- (audit finding, see planning/audit-2026-07-27-findings.md section 7 item 1
-- and section 2 row "baseline.sql:3677-3747,3810-4440").
--
-- Scope discipline: this migration ONLY drops account_links-era policies that
-- are PROVEN redundant — either by a live pre-flight data check (no row would
-- become inaccessible) or by pure logical subset (the surviving policy's
-- predicate is strictly weaker/broader). Every DROP is guarded so this file
-- is safe to re-run.
--
-- Explicitly NOT touched in this migration (see the "RLS: account_links-era
-- policies still load-bearing" section of claude/database.md for the
-- durable, tracked rationale and preconditions to lift each deferral):
--   - coaches, documents, performance_metrics, social_media_posts,
--     recommendation_letters: current app code (stores/coaches.ts,
--     composables/useDocumentsConsolidated.ts, usePerformance*.ts) inserts
--     rows WITHOUT setting family_unit_id, and no DB trigger backfills it —
--     so the family-model policies on these tables cannot be assumed
--     sufficient without a real backfill, which is out of scope here.
--   - DELETE on schools/coaches/documents/performance_metrics: no
--     family_unit_id/family_members-based DELETE policy exists on these
--     tables at all (structural gap, not a data gap) — nothing to fall back
--     to, so the account_links-era DELETE policies stay.
--   - interactions INSERT: dropping "Users can insert interactions" breaks
--     the Phase 1 regression test (d) — see comment below.

-- ─────────────────────────────────────────────────────────────────────────
-- Pre-flight data verification. Each check aborts the whole migration
-- (transactional) if it finds data that would lose access once the
-- corresponding account_links-era policy is dropped below. This runs at
-- migration-apply time in every environment (local/QA/prod), not just
-- against whatever happens to be seeded locally.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  orphan_count integer;
BEGIN
  -- schools SELECT/UPDATE below rely solely on family_unit_id membership.
  SELECT count(*) INTO orphan_count FROM public.schools WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Phase 10a RLS consolidation aborted: % schools row(s) have NULL family_unit_id; dropping the account_links-era schools SELECT/UPDATE policies would strand these rows. Backfill family_unit_id before retrying this migration.',
      orphan_count;
  END IF;

  -- users SELECT below relies solely on family_members co-membership.
  -- Every *accepted* account_links pair must already be co-resident in
  -- family_members (same family_unit_id) or dropping "Users can view linked
  -- family members" would strand a legacy pair that was never migrated to
  -- the family model.
  SELECT count(*) INTO orphan_count
  FROM public.account_links al
  WHERE al.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1
      FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.family_unit_id = fm2.family_unit_id
      WHERE fm1.user_id = al.parent_user_id
        AND fm2.user_id = al.player_user_id
    );
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Phase 10a RLS consolidation aborted: % accepted account_links pair(s) are not co-resident in family_members; dropping "Users can view linked family members" would strand these pairs.',
      orphan_count;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. schools: family_unit_id-based SELECT/UPDATE fully supersede the
--    account_links-era ("Linked users can ...") and get_linked_user_ids()-
--    based ("Users can ... own and linked schools") policies, verified above.
--    DELETE and the plain-ownership "Linked users can create schools" CHECK
--    (user_id = auth.uid(), not actually account_links-based despite the
--    name) are left untouched — out of scope.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Linked users can read schools" ON "public"."schools";
DROP POLICY IF EXISTS "Users can view own and linked schools" ON "public"."schools";

DROP POLICY IF EXISTS "Linked users can update schools" ON "public"."schools";
DROP POLICY IF EXISTS "Users can update own and linked schools" ON "public"."schools";

DROP POLICY IF EXISTS "Users can insert schools" ON "public"."schools";

-- ─────────────────────────────────────────────────────────────────────────
-- 2. interactions:
--    - UPDATE/DELETE: the account_links-era "their own interactions"
--      policies additionally required school_id ownership on top of
--      logged_by = auth.uid(); the surviving "own interactions" policies
--      gate on logged_by = auth.uid() alone, a strictly broader predicate.
--      Dropping the narrower AND'd policy cannot change access (pure
--      logical subset, no data dependency).
--    - SELECT and INSERT: NOT touched — verified empirically unsafe.
--      "Only players can create interactions" (INSERT) and "Family members
--      can view interactions in their families" (SELECT) both require the
--      *inserted row's own* family_unit_id column to be populated. Postgres
--      additionally requires an INSERT ... RETURNING row to pass a SELECT
--      policy, not just the WITH CHECK — so any insert that omits
--      family_unit_id (Phase 1's own regression test does; see test (d),
--      "accepts an insert attributed to the authenticated user") depends on
--      the account_links-era "Users can insert interactions" /
--      "Users can view interactions for own and linked schools" policies
--      for both the WITH CHECK and the RETURNING-visibility check. Dropping
--      either breaks that Phase 1 test (both failure modes reproduced
--      directly against Postgres, not guessed). Real app code
--      (composables/useInteractions.ts createInteraction) always sets
--      family_unit_id, so this only matters for callers that don't — a
--      real, if narrow, family_unit_id-population gap. Deferred.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update their own interactions" ON "public"."interactions";
DROP POLICY IF EXISTS "Users can delete their own interactions" ON "public"."interactions";

-- ─────────────────────────────────────────────────────────────────────────
-- 3. users: family_members-based SELECT fully supersedes the account_links-
--    based "Users can view linked family members", verified above (every
--    accepted account_links pair is co-resident in family_members).
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view linked family members" ON "public"."users";

-- ─────────────────────────────────────────────────────────────────────────
-- 4. events: Phase 1 (20260727000000_rls_security_hotfix_phase1.sql) fixed
--    the "for own schools" SELECT/UPDATE/DELETE policies to gate on
--    user_id = auth.uid(), leaving them byte-identical in effect to the
--    pre-existing "own events" / "their own events" policies of the same
--    verb (triplicated, not account_links-related). Collapse each verb to
--    one canonical "own" policy plus the family-model one — provably
--    no-op since the dropped predicates are identical to the kept one.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view events for own schools" ON "public"."events";
DROP POLICY IF EXISTS "Users can update events for own schools" ON "public"."events";
DROP POLICY IF EXISTS "Users can delete events for own schools" ON "public"."events";
DROP POLICY IF EXISTS "Users can delete their own events" ON "public"."events";
