-- Enable RLS on suggestion table and add access control policies
-- Fixes: RLS disabled on public.suggestion, outdated auth.jwt() INSERT policy
-- Reference: Security advisor, migration 026_suggestion_rls_tighten.sql

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.suggestion ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INSERT: service_role only (replaces outdated auth.jwt() ->> 'role' check)
-- ============================================================================

DROP POLICY IF EXISTS "Service role can insert suggestions" ON public.suggestion;

CREATE POLICY "Service role can insert suggestions"
  ON public.suggestion
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- SELECT: athletes see their own suggestions
-- ============================================================================

CREATE POLICY "Athletes can view own suggestions"
  ON public.suggestion
  FOR SELECT
  USING (athlete_id = auth.uid());

-- ============================================================================
-- SELECT: parents see suggestions for family members they are linked to
-- ============================================================================

CREATE POLICY "Parents can view family member suggestions"
  ON public.suggestion
  FOR SELECT
  USING (
    athlete_id IN (
      SELECT fm2.user_id
      FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.family_unit_id = fm2.family_unit_id
      WHERE fm1.user_id = auth.uid()
        AND fm2.user_id != auth.uid()
    )
  );

-- ============================================================================
-- UPDATE: athletes can update their own suggestions (e.g., dismiss them)
-- ============================================================================

CREATE POLICY "Athletes can update own suggestions"
  ON public.suggestion
  FOR UPDATE
  USING (athlete_id = auth.uid());

-- ============================================================================
-- DELETE: athletes can delete their own suggestions
-- ============================================================================

CREATE POLICY "Athletes can delete own suggestions"
  ON public.suggestion
  FOR DELETE
  USING (athlete_id = auth.uid());
