-- RLS family-model consolidation, Phase 3: additive family-model policies.
--
-- Strictly additive — no legacy/account_links policy is dropped, altered, or
-- replaced here. Every DROP POLICY IF EXISTS in this file targets only a
-- policy created by THIS migration (drop-then-create for idempotent
-- re-runs); legacy account_links-era policies remain untouched and
-- load-bearing per claude/database.md:27-35. Cutover (dropping the legacy
-- policies once these are proven safe) happens in a later phase, not here.
--
-- Fills two gaps documented in claude/database.md:27-35:
--   1. DELETE on schools, coaches, documents, performance_metrics has no
--      family-model policy at all today — a structural gap, not a
--      redundant pair with account_links. (claude/database.md:33)
--   2. social_media_posts and recommendation_letters carry no working
--      family-model policies — recommendation_letters has none whatsoever;
--      social_media_posts' only family-adjacent policy is the coach-join
--      SELECT (`social_media_posts_select_family`), left untouched here.
--      Both tables gained a `family_unit_id` column + derivation trigger in
--      Phase 1 (20260805000000_family_unit_id_columns_trigger_backfill.sql).
--      (claude/database.md:31)
--
-- Canonical family-membership predicate, copied verbatim from the baseline
-- schools SELECT policy (00000000000000_baseline.sql:3665):
--   family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
--
-- Role scoping and USING/WITH CHECK shape mirror the existing family-model
-- policies in baseline exactly: no `TO authenticated` clause (none of the
-- existing family CRUD policies on schools/coaches/documents/
-- performance_metrics/offers/events carry one), and UPDATE policies carry
-- USING only — no WITH CHECK — matching "Users can update schools in their
-- families" (00000000000000_baseline.sql:4228) and every other family
-- UPDATE policy in baseline.
--
-- On the USING-only shape: per CREATE POLICY semantics, an UPDATE policy
-- that specifies USING but no WITH CHECK has its USING expression applied
-- AS the WITH CHECK too, evaluated against the post-update row. So these
-- Phase 3 family UPDATE policies already block a member from moving a row's
-- family_unit_id into a family they don't belong to — omitting WITH CHECK
-- here does not, by itself, open a row-move hole.
--
-- The real (pre-existing) row-move exposure is orthogonal to this
-- migration: legacy PERMISSIVE policies on these tables whose predicates
-- don't reference family_unit_id at all (e.g. plain `user_id = auth.uid()`
-- ownership checks) still apply, and PERMISSIVE policies OR together — so a
-- legacy policy's check can independently pass an update that moves the row
-- to another family, regardless of what this migration's WITH CHECK
-- enforces. That exposure closes automatically once the legacy policies are
-- dropped (Phases 4/5), not by adding WITH CHECK here. Phase 4 item 0 still
-- adds explicit WITH CHECK to every family UPDATE policy repo-wide, but as
-- documentation/consistency hardening ahead of the drops, not as the fix for
-- a hole this migration leaves open — see
-- planning/rls-family-consolidation-plan.md Phase 4 item 0.

-- =============================================================================
-- 1. Family DELETE policies (Deferral C) — schools, coaches, documents,
--    performance_metrics. Naming mirrors "Users can delete offers in their
--    families" (00000000000000_baseline.sql:3871).
-- =============================================================================

DROP POLICY IF EXISTS "Users can delete schools in their families" ON public.schools;
CREATE POLICY "Users can delete schools in their families" ON public.schools
  FOR DELETE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete coaches in their families" ON public.coaches;
CREATE POLICY "Users can delete coaches in their families" ON public.coaches
  FOR DELETE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete documents in their families" ON public.documents;
CREATE POLICY "Users can delete documents in their families" ON public.documents
  FOR DELETE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete performance metrics in their families" ON public.performance_metrics;
CREATE POLICY "Users can delete performance metrics in their families" ON public.performance_metrics
  FOR DELETE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 2. social_media_posts — family SELECT/INSERT/UPDATE/DELETE on the new
--    (Phase 1) family_unit_id column. The existing coach-join
--    `social_media_posts_select_family` policy is untouched — this is an
--    additional, independent SELECT path, not a replacement.
-- =============================================================================

DROP POLICY IF EXISTS "Users can view social media posts in their families" ON public.social_media_posts;
CREATE POLICY "Users can view social media posts in their families" ON public.social_media_posts
  FOR SELECT USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create social media posts in their families" ON public.social_media_posts;
CREATE POLICY "Users can create social media posts in their families" ON public.social_media_posts
  FOR INSERT WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update social media posts in their families" ON public.social_media_posts;
CREATE POLICY "Users can update social media posts in their families" ON public.social_media_posts
  FOR UPDATE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete social media posts in their families" ON public.social_media_posts;
CREATE POLICY "Users can delete social media posts in their families" ON public.social_media_posts
  FOR DELETE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 3. recommendation_letters — family SELECT/INSERT/UPDATE/DELETE. This table
--    has ZERO family-model policies before this migration; its only access
--    control today is the get_linked_user_ids()-based account_links
--    policies (00000000000000_baseline.sql:3892, :4041, :4063), which stay
--    load-bearing and untouched.
-- =============================================================================

DROP POLICY IF EXISTS "Users can view recommendation letters in their families" ON public.recommendation_letters;
CREATE POLICY "Users can view recommendation letters in their families" ON public.recommendation_letters
  FOR SELECT USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create recommendation letters in their families" ON public.recommendation_letters;
CREATE POLICY "Users can create recommendation letters in their families" ON public.recommendation_letters
  FOR INSERT WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update recommendation letters in their families" ON public.recommendation_letters;
CREATE POLICY "Users can update recommendation letters in their families" ON public.recommendation_letters
  FOR UPDATE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete recommendation letters in their families" ON public.recommendation_letters;
CREATE POLICY "Users can delete recommendation letters in their families" ON public.recommendation_letters
  FOR DELETE USING (
    family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
  );
