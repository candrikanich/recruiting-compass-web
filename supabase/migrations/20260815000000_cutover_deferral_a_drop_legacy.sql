-- RLS family-model consolidation, Phase 5: big cutover — Deferral A legacy
-- drops (coaches, documents, performance_metrics, social_media_posts,
-- recommendation_letters).
--
-- See planning/rls-family-consolidation-plan.md "Phase 5" for full rationale.
-- Live pg_policies reconciled against this drop list on 2026-08-02 (mandatory
-- first step per the plan) — matched exactly what's dropped below, no drift
-- from baseline.sql.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 1. Re-run idempotent backfills (school-chain then unambiguous-user
--    fallback, same shape as Phase 1) in case any rows landed NULL since.
-- ─────────────────────────────────────────────────────────────────────────

UPDATE public.coaches c
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE c.family_unit_id IS NULL AND c.school_id = s.id AND s.family_unit_id IS NOT NULL;

UPDATE public.documents d
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE d.family_unit_id IS NULL AND d.school_id IS NOT NULL AND d.school_id = s.id AND s.family_unit_id IS NOT NULL;

-- Guarded: 20260814000000 drops social_media_posts. In prod's real apply order
-- this ran while the table still existed; in a from-zero rebuild (filename
-- order) the table is already gone, so skip.
DO $$
BEGIN
  IF to_regclass('public.social_media_posts') IS NOT NULL THEN
    UPDATE public.social_media_posts smp
    SET family_unit_id = s.family_unit_id
    FROM public.schools s
    WHERE smp.family_unit_id IS NULL AND smp.school_id = s.id AND s.family_unit_id IS NOT NULL;
  END IF;
END $$;

UPDATE public.recommendation_letters rl
SET family_unit_id = d.family_unit_id
FROM public.documents d
WHERE rl.family_unit_id IS NULL AND rl.document_id IS NOT NULL AND rl.document_id = d.id AND d.family_unit_id IS NOT NULL;

UPDATE public.coaches c
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members GROUP BY user_id HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE c.family_unit_id IS NULL AND c.user_id = owner.user_id;

UPDATE public.documents d
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members GROUP BY user_id HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE d.family_unit_id IS NULL AND d.user_id = owner.user_id;

UPDATE public.performance_metrics pm
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members GROUP BY user_id HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE pm.family_unit_id IS NULL AND pm.user_id = owner.user_id;

UPDATE public.recommendation_letters rl
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members GROUP BY user_id HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE rl.family_unit_id IS NULL AND rl.user_id = owner.user_id;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Pre-flight guard. social_media_posts has no user_id column (only
--    school_id, NOT NULL) so 1 alone gives it full coverage — still checked.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count FROM public.coaches WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Phase 5 cutover aborted: % coaches row(s) have NULL family_unit_id.', orphan_count;
  END IF;

  SELECT count(*) INTO orphan_count FROM public.documents WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Phase 5 cutover aborted: % documents row(s) have NULL family_unit_id.', orphan_count;
  END IF;

  SELECT count(*) INTO orphan_count FROM public.performance_metrics WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Phase 5 cutover aborted: % performance_metrics row(s) have NULL family_unit_id.', orphan_count;
  END IF;

  IF to_regclass('public.social_media_posts') IS NOT NULL THEN
    SELECT count(*) INTO orphan_count FROM public.social_media_posts WHERE family_unit_id IS NULL;
    IF orphan_count > 0 THEN
      RAISE EXCEPTION 'Phase 5 cutover aborted: % social_media_posts row(s) have NULL family_unit_id.', orphan_count;
    END IF;
  END IF;

  SELECT count(*) INTO orphan_count FROM public.recommendation_letters WHERE family_unit_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Phase 5 cutover aborted: % recommendation_letters row(s) have NULL family_unit_id.', orphan_count;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Drops. Exact definitions preserved in comments for rollback. After this
--    migration, each table/verb has exactly one permissive policy — the
--    family-model one — satisfying the audit exit criterion
--    (plans/audit-remediation.md:186-191).
-- ─────────────────────────────────────────────────────────────────────────

-- coaches (17 legacy policies) — keep "... in their families" ×4.
-- Rollback definitions:
--   "Linked users can delete coaches": FOR DELETE USING (user_id = auth.uid() OR user_id IN (
--     SELECT CASE WHEN account_links.parent_user_id = auth.uid() THEN account_links.player_user_id
--                 WHEN account_links.player_user_id = auth.uid() THEN account_links.parent_user_id
--                 ELSE NULL::uuid END FROM account_links
--     WHERE account_links.status = 'accepted' AND (account_links.parent_user_id = auth.uid() OR account_links.player_user_id = auth.uid())));
--   "Users can delete coaches at their schools": FOR DELETE USING (EXISTS (SELECT 1 FROM schools WHERE schools.id = coaches.school_id AND schools.user_id = auth.uid()));
--   "Users can delete coaches for own and linked schools": FOR DELETE USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Users can delete own and linked coaches": FOR DELETE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can delete own coaches": FOR DELETE USING (user_id = auth.uid());
--   "Linked users can create coaches": FOR INSERT WITH CHECK (user_id = auth.uid());
--   "Users can create own coaches": FOR INSERT WITH CHECK (user_id = auth.uid());
--   "Users can insert coaches at their schools": FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM schools WHERE schools.id = coaches.school_id AND schools.user_id = auth.uid()));
--   "Users can insert coaches for own and linked schools": FOR INSERT WITH CHECK (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Linked users can read coaches": FOR SELECT USING (user_id = auth.uid() OR user_id IN (
--     SELECT CASE WHEN account_links.parent_user_id = auth.uid() THEN account_links.player_user_id
--                 WHEN account_links.player_user_id = auth.uid() THEN account_links.parent_user_id
--                 ELSE NULL::uuid END FROM account_links
--     WHERE account_links.status = 'accepted' AND (account_links.parent_user_id = auth.uid() OR account_links.player_user_id = auth.uid())));
--   "Users can read own and linked coaches": FOR SELECT USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can view coaches at their schools": FOR SELECT USING (EXISTS (SELECT 1 FROM schools WHERE schools.id = coaches.school_id AND schools.user_id = auth.uid()));
--   "Users can view coaches for own and linked schools": FOR SELECT USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Linked users can update coaches": FOR UPDATE USING (user_id = auth.uid() OR user_id IN (
--     SELECT CASE WHEN account_links.parent_user_id = auth.uid() THEN account_links.player_user_id
--                 WHEN account_links.player_user_id = auth.uid() THEN account_links.parent_user_id
--                 ELSE NULL::uuid END FROM account_links
--     WHERE account_links.status = 'accepted' AND (account_links.parent_user_id = auth.uid() OR account_links.player_user_id = auth.uid()))) WITH CHECK (user_id = auth.uid());
--   "Users can update coaches at their schools": FOR UPDATE USING (EXISTS (SELECT 1 FROM schools WHERE schools.id = coaches.school_id AND schools.user_id = auth.uid()));
--   "Users can update coaches for own and linked schools": FOR UPDATE USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Users can update own and linked coaches": FOR UPDATE USING (user_id IN (SELECT user_id FROM get_linked_user_ids())) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Linked users can delete coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can delete coaches at their schools" ON public.coaches;
DROP POLICY IF EXISTS "Users can delete coaches for own and linked schools" ON public.coaches;
DROP POLICY IF EXISTS "Users can delete own and linked coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can delete own coaches" ON public.coaches;
DROP POLICY IF EXISTS "Linked users can create coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can create own coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can insert coaches at their schools" ON public.coaches;
DROP POLICY IF EXISTS "Users can insert coaches for own and linked schools" ON public.coaches;
DROP POLICY IF EXISTS "Linked users can read coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can read own and linked coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can view coaches at their schools" ON public.coaches;
DROP POLICY IF EXISTS "Users can view coaches for own and linked schools" ON public.coaches;
DROP POLICY IF EXISTS "Linked users can update coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can update coaches at their schools" ON public.coaches;
DROP POLICY IF EXISTS "Users can update coaches for own and linked schools" ON public.coaches;
DROP POLICY IF EXISTS "Users can update own and linked coaches" ON public.coaches;

-- documents (6 legacy policies) — keep "... in their families" ×4.
-- Rollback definitions:
--   "Users can delete own and linked documents": FOR DELETE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can delete own documents": FOR DELETE USING (user_id = auth.uid());
--   "Users can insert documents": FOR INSERT WITH CHECK (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can insert own documents": FOR INSERT WITH CHECK (auth.uid() = user_id);
--   "Users can view own and linked documents": FOR SELECT USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can update own and linked documents": FOR UPDATE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
DROP POLICY IF EXISTS "Users can delete own and linked documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view own and linked documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own and linked documents" ON public.documents;

-- performance_metrics (6 legacy policies) — keep "... in their families" ×4.
-- Rollback definitions:
--   "Users can delete own and linked performance metrics": FOR DELETE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can delete own performance metrics": FOR DELETE USING (user_id = auth.uid());
--   "Users can insert own performance metrics": FOR INSERT WITH CHECK (auth.uid() = user_id);
--   "Users can insert performance metrics": FOR INSERT WITH CHECK (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can view own and linked performance metrics": FOR SELECT USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can update own and linked performance metrics": FOR UPDATE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
DROP POLICY IF EXISTS "Users can delete own and linked performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can delete own performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can insert own performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can insert performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can view own and linked performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can update own and linked performance metrics" ON public.performance_metrics;

-- recommendation_letters (5 legacy policies) — keep "... in their families" ×4.
-- Rollback definitions:
--   "Users can delete own and linked recommendation letters": FOR DELETE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can insert own recommendation letters": FOR INSERT WITH CHECK (auth.uid() = user_id);
--   "Users can insert recommendation letters": FOR INSERT WITH CHECK (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can view own and linked recommendation letters": FOR SELECT USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
--   "Users can update own and linked recommendation letters": FOR UPDATE USING (user_id IN (SELECT user_id FROM get_linked_user_ids()));
DROP POLICY IF EXISTS "Users can delete own and linked recommendation letters" ON public.recommendation_letters;
DROP POLICY IF EXISTS "Users can insert own recommendation letters" ON public.recommendation_letters;
DROP POLICY IF EXISTS "Users can insert recommendation letters" ON public.recommendation_letters;
DROP POLICY IF EXISTS "Users can view own and linked recommendation letters" ON public.recommendation_letters;
DROP POLICY IF EXISTS "Users can update own and linked recommendation letters" ON public.recommendation_letters;

-- social_media_posts (9 legacy policies, incl. the coach-join SELECT
-- `social_media_posts_select_family` — superseded by the direct family
-- SELECT policy, per plan) — keep "... in their families" ×4.
-- Rollback definitions:
--   "Users can delete posts for linked schools": FOR DELETE USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Users can insert posts for own and linked schools": FOR INSERT WITH CHECK (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Users can insert posts for own schools": FOR INSERT WITH CHECK (school_id IS NULL OR school_id IN (SELECT schools.id FROM schools WHERE schools.user_id = auth.uid()));
--   "Users can view posts for own and linked schools": FOR SELECT USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Users can view posts for their schools": FOR SELECT USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id = auth.uid()));
--   "Users can view posts for their schools and coaches": FOR SELECT USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id = auth.uid()) OR coach_id IN (SELECT c.id FROM coaches c JOIN schools s ON c.school_id = s.id WHERE s.user_id = auth.uid()));
--   "social_media_posts_select_family": FOR SELECT USING (EXISTS (SELECT 1 FROM coaches c JOIN family_members fm ON fm.family_unit_id = c.family_unit_id WHERE c.id = social_media_posts.coach_id AND fm.user_id = auth.uid()));
--   "Users can update posts for linked schools": FOR UPDATE USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id IN (SELECT user_id FROM get_linked_user_ids())));
--   "Users can update posts for their schools and coaches": FOR UPDATE USING (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id = auth.uid()) OR coach_id IN (SELECT c.id FROM coaches c JOIN schools s ON c.school_id = s.id WHERE s.user_id = auth.uid())) WITH CHECK (school_id IN (SELECT schools.id FROM schools WHERE schools.user_id = auth.uid()) OR coach_id IN (SELECT c.id FROM coaches c JOIN schools s ON c.school_id = s.id WHERE s.user_id = auth.uid()));
-- Guarded: DROP POLICY IF EXISTS still errors if the TABLE is absent (the
-- IF EXISTS covers the policy, not the table). Skip when already dropped.
DO $$
BEGIN
  IF to_regclass('public.social_media_posts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can delete posts for linked schools" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can insert posts for own and linked schools" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can insert posts for own schools" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can view posts for own and linked schools" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can view posts for their schools" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can view posts for their schools and coaches" ON public.social_media_posts;
    DROP POLICY IF EXISTS "social_media_posts_select_family" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can update posts for linked schools" ON public.social_media_posts;
    DROP POLICY IF EXISTS "Users can update posts for their schools and coaches" ON public.social_media_posts;
  END IF;
END $$;
