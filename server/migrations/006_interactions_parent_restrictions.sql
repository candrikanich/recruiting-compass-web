-- Migration: Add Parent Read-Only Restrictions to interactions
-- Purpose: Prevent parents from logging interactions while allowing read access
-- Version: 1.0

-- Enable Row Level Security
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view interactions for own and linked schools" ON public.interactions;
DROP POLICY IF EXISTS "Users can insert interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can update interactions in linked schools" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete interactions in linked schools" ON public.interactions;

-- Policy: SELECT - Allow viewing interactions for accessible schools (no parent restriction)
CREATE POLICY "Users can view interactions for own and linked schools" ON public.interactions
  FOR SELECT
  USING (
    school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
  );

-- Policy: INSERT - Block parents from creating interactions
CREATE POLICY "Non-parents can insert interactions" ON public.interactions
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.schools s
      INNER JOIN public.users u ON u.id = auth.uid()
      WHERE s.id = school_id
        AND u.role = 'parent'
        AND public.is_parent_viewing_linked_athlete(s.user_id)
    )
  );

-- Policy: UPDATE - Block parents from updating interactions
CREATE POLICY "Non-parents can update interactions" ON public.interactions
  FOR UPDATE
  USING (
    school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.schools s
      INNER JOIN public.users u ON u.id = auth.uid()
      WHERE s.id = school_id
        AND u.role = 'parent'
        AND public.is_parent_viewing_linked_athlete(s.user_id)
    )
  );

-- Policy: DELETE - Block parents from deleting interactions
CREATE POLICY "Non-parents can delete interactions" ON public.interactions
  FOR DELETE
  USING (
    school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.schools s
      INNER JOIN public.users u ON u.id = auth.uid()
      WHERE s.id = school_id
        AND u.role = 'parent'
        AND public.is_parent_viewing_linked_athlete(s.user_id)
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view interactions for own and linked schools" ON public.interactions IS
  'Allows viewing interactions for schools owned by user or linked accounts';

COMMENT ON POLICY "Non-parents can insert interactions" ON public.interactions IS
  'Only non-parents can create interactions. Blocks parents from logging interactions for linked athletes.';

COMMENT ON POLICY "Non-parents can update interactions" ON public.interactions IS
  'Only non-parents can update interactions. Blocks parents from modifying interaction records.';

COMMENT ON POLICY "Non-parents can delete interactions" ON public.interactions IS
  'Only non-parents can delete interactions. Blocks parents from removing interaction records.';
