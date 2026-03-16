-- Fix infinite recursion in family_members RLS policy.
--
-- The self-referential SELECT policy causes 42P17 infinite recursion because
-- Postgres evaluates the policy when accessing family_members, which in turn
-- queries family_members again.
--
-- Solution: use the existing SECURITY DEFINER function get_user_family_ids()
-- which executes as the function owner (bypassing RLS), breaking the cycle.

DROP POLICY IF EXISTS "Users can view family members" ON family_members;

CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT
  USING (
    family_unit_id IN (SELECT fid.family_unit_id FROM get_user_family_ids() fid)
  );
