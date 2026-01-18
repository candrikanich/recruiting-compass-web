-- Migration: Add RLS Policies to parent_view_log
-- Purpose: Ensure parents can only log their own views and athletes can see logs about themselves
-- Version: 1.0

-- Enable Row Level Security
ALTER TABLE public.parent_view_log ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT - Parents can log views of linked athletes
CREATE POLICY "Parents can log views of linked athletes" ON public.parent_view_log
  FOR INSERT
  WITH CHECK (
    parent_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.account_links
      WHERE status = 'accepted'
        AND parent_user_id = auth.uid()
        AND player_user_id = athlete_id
    )
  );

-- Policy: SELECT - Athletes can view logs about themselves
CREATE POLICY "Athletes can view logs about themselves" ON public.parent_view_log
  FOR SELECT
  USING (
    athlete_id = auth.uid()
  );

-- Policy: SELECT - Parents can view their own logs
CREATE POLICY "Parents can view their own logs" ON public.parent_view_log
  FOR SELECT
  USING (
    parent_user_id = auth.uid()
  );

-- Add comments for documentation
COMMENT ON POLICY "Parents can log views of linked athletes" ON public.parent_view_log IS
  'Only parents can insert view logs, and only for linked athletes they have accepted connections with';

COMMENT ON POLICY "Athletes can view logs about themselves" ON public.parent_view_log IS
  'Allows athletes to see when parents have viewed their data (symmetric visibility)';

COMMENT ON POLICY "Parents can view their own logs" ON public.parent_view_log IS
  'Allows parents to view logs of what they have viewed';
