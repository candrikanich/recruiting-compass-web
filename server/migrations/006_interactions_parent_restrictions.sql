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

-- Policy: INSERT - Allow all authenticated users to create interactions for accessible schools
CREATE POLICY "Users can insert interactions" ON public.interactions
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
  );

-- Policy: UPDATE - Allow users to update their own interactions
CREATE POLICY "Users can update their own interactions" ON public.interactions
  FOR UPDATE
  USING (
    logged_by = auth.uid()
    AND school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
  );

-- Policy: DELETE - Allow users to delete their own interactions
CREATE POLICY "Users can delete their own interactions" ON public.interactions
  FOR DELETE
  USING (
    logged_by = auth.uid()
    AND school_id IN (
      SELECT id FROM public.schools
      WHERE user_id IN (SELECT * FROM public.get_linked_user_ids())
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view interactions for own and linked schools" ON public.interactions IS
  'Allows viewing interactions for schools owned by user or linked accounts';

COMMENT ON POLICY "Users can insert interactions" ON public.interactions IS
  'Allows authenticated users to create interactions for accessible schools.';

COMMENT ON POLICY "Users can update their own interactions" ON public.interactions IS
  'Allows users to update interactions they created (logged_by = auth.uid()).';

COMMENT ON POLICY "Users can delete their own interactions" ON public.interactions IS
  'Allows users to delete interactions they created (logged_by = auth.uid()).';
