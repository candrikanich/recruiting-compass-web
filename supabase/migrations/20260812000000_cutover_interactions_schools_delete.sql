-- RLS family-model consolidation, Phase 4: small cutover — interactions
-- (Deferral B) + schools DELETE (part of Deferral C).
--
-- See planning/rls-family-consolidation-plan.md "Phase 4" for full rationale.
-- This is the first migration in the series that DROPS legacy account_links-
-- era / plain-ownership policies rather than only adding family-model ones.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 0. WITH CHECK hardening (consistency, not a fix — see plan Phase 4 item 0).
--    Recreate every family UPDATE policy repo-wide with an explicit WITH
--    CHECK matching its USING predicate. A USING-only UPDATE policy already
--    applies USING as WITH CHECK against the post-update row, so this does
--    not by itself close any hole; the real row-move exposure is legacy
--    PERMISSIVE policies whose predicates don't reference family_unit_id,
--    which OR together with the family policy and close only when dropped
--    (this phase for interactions; Phase 5 for the rest). Landed here for
--    clarity ahead of those drops.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update schools in their families" ON public.schools;
CREATE POLICY "Users can update schools in their families" ON public.schools
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update coaches in their families" ON public.coaches;
CREATE POLICY "Users can update coaches in their families" ON public.coaches
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update documents in their families" ON public.documents;
CREATE POLICY "Users can update documents in their families" ON public.documents
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update events in their families" ON public.events;
CREATE POLICY "Users can update events in their families" ON public.events
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update performance metrics in their families" ON public.performance_metrics;
CREATE POLICY "Users can update performance metrics in their families" ON public.performance_metrics
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update social media posts in their families" ON public.social_media_posts;
CREATE POLICY "Users can update social media posts in their families" ON public.social_media_posts
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update recommendation letters in their families" ON public.recommendation_letters;
CREATE POLICY "Users can update recommendation letters in their families" ON public.recommendation_letters
  FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Re-run idempotent backfills for the two tables cut over below, in case
--    any rows landed NULL between Phase 1 apply and now (service-role writes
--    predating the trigger, etc.).
-- ─────────────────────────────────────────────────────────────────────────

UPDATE public.interactions i
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE i.family_unit_id IS NULL
  AND i.school_id = s.id
  AND s.family_unit_id IS NOT NULL;

UPDATE public.interactions i
SET family_unit_id = sub.family_unit_id
FROM (
  SELECT fm.user_id, min(fm.family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members fm
  GROUP BY fm.user_id
  HAVING count(DISTINCT fm.family_unit_id) = 1
) sub
WHERE i.family_unit_id IS NULL
  AND i.logged_by = sub.user_id;

UPDATE public.schools s
SET family_unit_id = sub.family_unit_id
FROM (
  SELECT fm.user_id, min(fm.family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members fm
  GROUP BY fm.user_id
  HAVING count(DISTINCT fm.family_unit_id) = 1
) sub
WHERE s.family_unit_id IS NULL
  AND s.user_id = sub.user_id;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Pre-flight guard. Aborts the whole migration (transactional) if either
--    table still has rows with NULL family_unit_id after the backfill above
--    — those rows would become invisible/undeletable once the legacy
--    policies below are dropped. See plan "Unresolved questions" 1-2.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count FROM public.interactions WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Phase 4 cutover aborted: % interactions row(s) have NULL family_unit_id; dropping the legacy interactions SELECT/INSERT policies would strand these rows. Triage (likely multi-family logged_by) before retrying.',
      orphan_count;
  END IF;

  SELECT count(*) INTO orphan_count FROM public.schools WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Phase 4 cutover aborted: % schools row(s) have NULL family_unit_id; dropping the legacy schools DELETE policies would strand these rows. Triage before retrying.',
      orphan_count;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Drops. Exact definitions preserved below for rollback (recreate verbatim
--    if this cutover needs to be reverted).
-- ─────────────────────────────────────────────────────────────────────────

-- interactions: family SELECT ("Family members can view interactions in
-- their families") + "Only players can create interactions" become the sole
-- policy set for SELECT/INSERT. The Phase 1 derive_family_unit_id trigger
-- stamps family_unit_id on INSERT before RETURNING evaluates the SELECT
-- policy, so INSERT...RETURNING keeps working for family-model rows.
--
-- Rollback ("Users can view interactions for own and linked schools"):
--   FOR SELECT USING (school_id IN (SELECT schools.id FROM schools WHERE
--     schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
-- Rollback ("Users can insert interactions"):
--   FOR INSERT WITH CHECK (logged_by = auth.uid() AND school_id IN
--     (SELECT schools.id FROM schools WHERE schools.user_id IN
--       (SELECT user_id FROM get_linked_user_ids())));
DROP POLICY IF EXISTS "Users can view interactions for own and linked schools" ON public.interactions;
DROP POLICY IF EXISTS "Users can insert interactions" ON public.interactions;

-- schools: family DELETE ("Users can delete schools in their families",
-- added Phase 3) becomes the sole DELETE policy.
--
-- Rollback ("Users can delete own and linked schools"):
--   FOR DELETE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
-- Rollback ("Users can delete own schools"):
--   FOR DELETE USING (user_id = auth.uid());
-- Rollback ("Linked users can delete schools"):
--   FOR DELETE USING (user_id = auth.uid() OR user_id IN (
--     SELECT CASE WHEN account_links.parent_user_id = auth.uid() THEN account_links.player_user_id
--                 WHEN account_links.player_user_id = auth.uid() THEN account_links.parent_user_id
--                 ELSE NULL::uuid END
--     FROM account_links
--     WHERE account_links.status = 'accepted'
--       AND (account_links.parent_user_id = auth.uid() OR account_links.player_user_id = auth.uid())));
DROP POLICY IF EXISTS "Users can delete own and linked schools" ON public.schools;
DROP POLICY IF EXISTS "Users can delete own schools" ON public.schools;
DROP POLICY IF EXISTS "Linked users can delete schools" ON public.schools;
