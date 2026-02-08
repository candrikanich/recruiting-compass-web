-- Migration 033: Standardize user role "student" → "player"
-- The codebase uses three terms interchangeably (student, player, athlete).
-- This migration standardizes on "player" for the user role.
-- Date: 2026-02-07

-- ============================================================================
-- 1. UPDATE user_role ENUM: replace 'student' with 'player'
-- ============================================================================
-- PostgreSQL cannot remove enum values or use newly added values in the same
-- transaction. Instead, create a new enum type and swap via text cast.

-- First, save and drop ALL RLS policies that reference 'role' on ANY table
-- (PostgreSQL blocks ALTER TYPE on columns referenced by policies)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual::text LIKE '%role%' OR with_check::text LIKE '%role%')
  LOOP
    RAISE NOTICE 'Dropping policy % on table %', pol.policyname, pol.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Create new enum without 'student'
CREATE TYPE user_role_new AS ENUM ('admin', 'parent', 'player');

-- Swap the column type, mapping 'student' → 'player' during the cast
ALTER TABLE users
  ALTER COLUMN role TYPE user_role_new
  USING (CASE WHEN role::text = 'student' THEN 'player' ELSE role::text END)::user_role_new;

-- Drop old enum and rename new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- ============================================================================
-- 2. UPDATE family_members.role CHECK CONSTRAINT
-- ============================================================================

-- Drop old CHECK constraint BEFORE migrating data
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_role_check;

-- Migrate existing data
UPDATE family_members SET role = 'player' WHERE role = 'student';

-- Add new CHECK constraint
ALTER TABLE family_members ADD CONSTRAINT family_members_role_check
  CHECK (role IN ('player', 'parent'));

-- ============================================================================
-- 3. RENAME COLUMN: family_units.student_user_id → player_user_id
-- ============================================================================

ALTER TABLE family_units RENAME COLUMN student_user_id TO player_user_id;

-- ============================================================================
-- 4. RECREATE INDEX: idx_student_one_family → idx_player_one_family
-- ============================================================================

DROP INDEX IF EXISTS idx_student_one_family;
CREATE UNIQUE INDEX idx_player_one_family ON family_members(user_id)
  WHERE role = 'player';

-- ============================================================================
-- 5. UPDATE SQL FUNCTIONS (from migration 021)
-- ============================================================================

-- is_parent_viewing_athlete: change fm_student.role = 'student' → 'player'
CREATE OR REPLACE FUNCTION is_parent_viewing_athlete(target_athlete_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM family_members fm_parent
    JOIN family_members fm_player ON fm_parent.family_unit_id = fm_player.family_unit_id
    WHERE fm_parent.user_id = auth.uid()
      AND fm_parent.role = 'parent'
      AND fm_player.user_id = target_athlete_id
      AND fm_player.role = 'player'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- get_accessible_athletes: change fm_student.role = 'student' → 'player'
CREATE OR REPLACE FUNCTION get_accessible_athletes()
RETURNS TABLE(athlete_id UUID, family_unit_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT fm_player.user_id, fm_player.family_unit_id
  FROM family_members fm_parent
  JOIN family_members fm_player ON fm_parent.family_unit_id = fm_player.family_unit_id
  WHERE fm_parent.user_id = auth.uid()
    AND fm_player.role = 'player'
  UNION
  SELECT fu.player_user_id, fu.id
  FROM family_units fu
  WHERE fu.player_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 6. UPDATE RLS POLICY: "Only students can create interactions" → "Only players..."
-- ============================================================================

DROP POLICY IF EXISTS "Only students can create interactions" ON interactions;

CREATE POLICY "Only players can create interactions" ON interactions
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
    AND logged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM family_members
      WHERE user_id = auth.uid() AND role = 'player'
    )
  );

-- ============================================================================
-- 7. DROP user_type COLUMN (redundant with role)
-- ============================================================================

-- Drop CHECK constraint from migration 030 first
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users DROP COLUMN IF EXISTS user_type;

-- ============================================================================
-- 8. UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE family_units IS 'Family unit: 1 player + N parents';
COMMENT ON COLUMN family_units.player_user_id IS 'The player member of this family (unique constraint ensures 1 family per player)';
COMMENT ON COLUMN family_members.role IS 'Role in family: player (1 per family) or parent (N per family)';
