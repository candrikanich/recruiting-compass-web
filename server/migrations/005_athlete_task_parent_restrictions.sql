-- Migration: Add Parent Read-Only Restrictions to athlete_task
-- Purpose: Prevent parents from modifying task status while allowing read access
-- Version: 1.0

-- Enable Row Level Security
ALTER TABLE public.athlete_task ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Allow viewing own tasks + linked account tasks
CREATE POLICY "Users can view own and linked athlete tasks" ON public.athlete_task
  FOR SELECT
  USING (
    athlete_id IN (SELECT * FROM public.get_linked_user_ids())
  );

-- Policy: INSERT - Only athletes can create their own task records
CREATE POLICY "Athletes can create own task records" ON public.athlete_task
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
    AND public.is_data_owner(athlete_id)
  );

-- Policy: UPDATE - Only athletes can update their own task status
CREATE POLICY "Athletes can update own task status" ON public.athlete_task
  FOR UPDATE
  USING (
    athlete_id = auth.uid()
    AND public.is_data_owner(athlete_id)
  );

-- Policy: DELETE - Only athletes can delete their own task records
CREATE POLICY "Athletes can delete own task records" ON public.athlete_task
  FOR DELETE
  USING (
    athlete_id = auth.uid()
    AND public.is_data_owner(athlete_id)
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view own and linked athlete tasks" ON public.athlete_task IS
  'Allows users to view their own athlete_task records and those of linked accounts (via account_links)';

COMMENT ON POLICY "Athletes can create own task records" ON public.athlete_task IS
  'Only athletes (data owners) can create new athlete_task records';

COMMENT ON POLICY "Athletes can update own task status" ON public.athlete_task IS
  'Only athletes (data owners) can update task status. Parents cannot modify tasks they are viewing.';

COMMENT ON POLICY "Athletes can delete own task records" ON public.athlete_task IS
  'Only athletes (data owners) can delete task records';
