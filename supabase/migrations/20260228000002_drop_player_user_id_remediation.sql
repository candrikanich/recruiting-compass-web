-- Remediation: Drop all objects that depend on family_units.player_user_id
-- so that 20260228000000 can complete its DROP COLUMN step.
--
-- Run this in the Supabase SQL Editor if the original migration failed with:
-- "cannot drop column player_user_id … because other objects depend on it"

-- ============================================================================
-- 1. Ensure created_by_user_id exists (idempotent — migration may have already run this)
-- ============================================================================
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id);

UPDATE family_units
  SET created_by_user_id = player_user_id
  WHERE created_by_user_id IS NULL AND player_user_id IS NOT NULL;

ALTER TABLE family_units
  ALTER COLUMN created_by_user_id SET NOT NULL;

ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS pending_player_details jsonb;

-- ============================================================================
-- 2. Update get_accessible_athletes() to remove player_user_id reference
-- ============================================================================
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
  SELECT fm.user_id, fm.family_unit_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid()
    AND fm.role = 'player';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. Drop all RLS policies that reference player_user_id (by name from error)
-- ============================================================================

-- family_units
DROP POLICY IF EXISTS "Users can view their family units" ON family_units;
DROP POLICY IF EXISTS "Users can view family units they belong to" ON family_units;
DROP POLICY IF EXISTS "Players can create their own family unit" ON family_units;
DROP POLICY IF EXISTS "family_units_select" ON family_units;
DROP POLICY IF EXISTS "family_units_insert" ON family_units;
DROP POLICY IF EXISTS "family_units_update" ON family_units;
DROP POLICY IF EXISTS "family_units_delete" ON family_units;

-- family_members
DROP POLICY IF EXISTS "Players can add themselves to their family" ON family_members;
DROP POLICY IF EXISTS "Users can view family members" ON family_members;

-- schools
DROP POLICY IF EXISTS "Users can view schools in their families" ON schools;
DROP POLICY IF EXISTS "Users can update schools in their families" ON schools;

-- coaches
DROP POLICY IF EXISTS "Users can view coaches in their families" ON coaches;
DROP POLICY IF EXISTS "Users can update coaches in their families" ON coaches;

-- events
DROP POLICY IF EXISTS "Users can view events in their families" ON events;
DROP POLICY IF EXISTS "Users can update events in their families" ON events;

-- documents
DROP POLICY IF EXISTS "Users can view documents in their families" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their families" ON documents;

-- performance_metrics
DROP POLICY IF EXISTS "Users can view performance metrics in their families" ON performance_metrics;
DROP POLICY IF EXISTS "Users can update performance metrics in their families" ON performance_metrics;

-- ============================================================================
-- 4. Now safe to drop player_user_id
-- ============================================================================
ALTER TABLE family_units
  DROP COLUMN IF EXISTS player_user_id;

-- ============================================================================
-- 5. Recreate family_units RLS policies (using created_by_user_id / members)
-- ============================================================================
ALTER TABLE family_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_units_select" ON family_units
  FOR SELECT USING (
    id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_units_insert" ON family_units
  FOR INSERT WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "family_units_update" ON family_units
  FOR UPDATE USING (
    id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_units_delete" ON family_units
  FOR DELETE USING (created_by_user_id = auth.uid());

-- ============================================================================
-- 6. Recreate family_members RLS policies
-- ============================================================================
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 7. Recreate data-table RLS policies (schools, coaches, events, documents, perf)
-- ============================================================================

-- schools
CREATE POLICY "Users can view schools in their families" ON schools
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update schools in their families" ON schools
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- coaches
CREATE POLICY "Users can view coaches in their families" ON coaches
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update coaches in their families" ON coaches
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- events
CREATE POLICY "Users can view events in their families" ON events
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update events in their families" ON events
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- documents
CREATE POLICY "Users can view documents in their families" ON documents
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update documents in their families" ON documents
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- performance_metrics
CREATE POLICY "Users can view performance metrics in their families" ON performance_metrics
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update performance metrics in their families" ON performance_metrics
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 8. Create family_invitations table and its RLS policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_unit_id   uuid NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  invited_by       uuid NOT NULL REFERENCES users(id),
  invited_email    text NOT NULL,
  role             text NOT NULL CHECK (role IN ('player', 'parent')),
  token            text NOT NULL UNIQUE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON family_invitations(token);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family ON family_invitations(family_unit_id, status);

ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_invitations_select" ON family_invitations;
DROP POLICY IF EXISTS "family_invitations_insert" ON family_invitations;
DROP POLICY IF EXISTS "family_invitations_update" ON family_invitations;
DROP POLICY IF EXISTS "family_invitations_delete" ON family_invitations;

CREATE POLICY "family_invitations_select" ON family_invitations
  FOR SELECT USING (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_invitations_insert" ON family_invitations
  FOR INSERT WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "family_invitations_update" ON family_invitations
  FOR UPDATE USING (invited_by = auth.uid());

CREATE POLICY "family_invitations_delete" ON family_invitations
  FOR DELETE USING (invited_by = auth.uid());
