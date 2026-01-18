-- Migration: Create Parent View RLS Helper Functions
-- Purpose: Enable role-based access control for parent/athlete data sharing
-- Version: 1.0

-- Helper function: Check if current user is a parent viewing linked athlete's data
CREATE OR REPLACE FUNCTION public.is_parent_viewing_linked_athlete(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_links al
    INNER JOIN public.users u ON u.id = auth.uid()
    WHERE al.status = 'accepted'
      AND al.parent_user_id = auth.uid()
      AND al.player_user_id = target_user_id
      AND u.role = 'parent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user is the data owner
CREATE OR REPLACE FUNCTION public.is_data_owner(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_parent_viewing_linked_athlete(target_user_id UUID) IS
  'Returns true if current user is a parent with accepted link to target user';

COMMENT ON FUNCTION public.is_data_owner(target_user_id UUID) IS
  'Returns true if current user owns the data (direct ownership, not through link)';
