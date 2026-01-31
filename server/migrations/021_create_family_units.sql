-- Phase 2: Family Unit System Implementation
-- Creates family_units, family_members, and user_notes tables
-- Adds family_unit_id to data tables for family-based access control
-- Date: 2026-01-31

-- ============================================================================
-- 1. CREATE family_units TABLE
-- ============================================================================
-- Represents a family unit: 1 student + N parents
-- Each student belongs to exactly ONE family unit
-- Each parent can belong to MULTIPLE family units (one per child)

CREATE TABLE IF NOT EXISTS family_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  family_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE family_units IS 'Family unit: 1 student + N parents';
COMMENT ON COLUMN family_units.student_user_id IS 'The student member of this family (unique constraint ensures 1 family per student)';
COMMENT ON COLUMN family_units.family_name IS 'Auto-generated name like "John Doe''s Family"';

-- ============================================================================
-- 2. CREATE family_members TABLE
-- ============================================================================
-- Maps users to family units with their role (student or parent)

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_unit_id UUID NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'parent')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_unit_id, user_id)
);

-- Ensure each student belongs to exactly ONE family (no duplicate student memberships)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_one_family ON family_members(user_id)
  WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_unit_id ON family_members(family_unit_id);

COMMENT ON TABLE family_members IS 'Maps users to family units';
COMMENT ON COLUMN family_members.role IS 'Role in family: student (1 per family) or parent (N per family)';

-- ============================================================================
-- 3. CREATE user_notes TABLE
-- ============================================================================
-- Stores private notes per user for each entity (school, coach, interaction)
-- Enables parent1 and parent2 to maintain separate private notes on same school

CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('school', 'coach', 'interaction')),
  entity_id UUID NOT NULL,
  note_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_entity ON user_notes(entity_type, entity_id);

COMMENT ON TABLE user_notes IS 'Private notes per user for schools, coaches, interactions';
COMMENT ON COLUMN user_notes.entity_type IS 'Type of entity being noted: school, coach, interaction';

-- ============================================================================
-- 4. ADD family_unit_id COLUMNS TO DATA TABLES
-- ============================================================================

-- Add to schools
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_schools_family_unit_id ON schools(family_unit_id);

-- Add to coaches
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coaches_family_unit_id ON coaches(family_unit_id);

-- Add to interactions
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_interactions_family_unit_id ON interactions(family_unit_id);

-- Add to offers (if exists)
ALTER TABLE IF EXISTS offers
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_offers_family_unit_id ON offers(family_unit_id);

-- Add to documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_family_unit_id ON documents(family_unit_id);

-- Add to events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_family_unit_id ON events(family_unit_id);

-- Add to performance_metrics
ALTER TABLE performance_metrics
ADD COLUMN IF NOT EXISTS family_unit_id UUID REFERENCES family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_performance_metrics_family_unit_id ON performance_metrics(family_unit_id);

-- ============================================================================
-- 5. CREATE/UPDATE HELPER FUNCTIONS
-- ============================================================================

-- Get all family unit IDs for current user
CREATE OR REPLACE FUNCTION get_user_family_ids()
RETURNS TABLE(family_unit_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT fm.family_unit_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_family_ids() IS 'Returns all family units user belongs to (as student or parent)';

-- Get the primary family unit ID for current user (for students, returns their family; for parents, requires context)
CREATE OR REPLACE FUNCTION get_primary_family_id()
RETURNS UUID AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- If user is a student, return their family
  SELECT fu.id INTO v_family_id
  FROM family_units fu
  WHERE fu.student_user_id = auth.uid();

  IF v_family_id IS NOT NULL THEN
    RETURN v_family_id;
  END IF;

  -- If user is a parent, return their first family (chronologically oldest)
  SELECT fm.family_unit_id INTO v_family_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid() AND fm.role = 'parent'
  ORDER BY fm.added_at ASC
  LIMIT 1;

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_primary_family_id() IS 'Returns primary family unit (students: their family, parents: oldest family)';

-- Check if user is a parent with access to athlete
CREATE OR REPLACE FUNCTION is_parent_viewing_athlete(target_athlete_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM family_members fm_parent
    JOIN family_members fm_student ON fm_parent.family_unit_id = fm_student.family_unit_id
    WHERE fm_parent.user_id = auth.uid()
      AND fm_parent.role = 'parent'
      AND fm_student.user_id = target_athlete_id
      AND fm_student.role = 'student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_parent_viewing_athlete(UUID) IS 'Check if current user is a parent with access to target athlete';

-- Get all athletes a parent has access to
CREATE OR REPLACE FUNCTION get_accessible_athletes()
RETURNS TABLE(athlete_id UUID, family_unit_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT fm_student.user_id, fm_student.family_unit_id
  FROM family_members fm_parent
  JOIN family_members fm_student ON fm_parent.family_unit_id = fm_student.family_unit_id
  WHERE fm_parent.user_id = auth.uid()
    AND fm_student.role = 'student'
  UNION
  SELECT fu.student_user_id, fu.id
  FROM family_units fu
  WHERE fu.student_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_accessible_athletes() IS 'Returns all athletes current user can access (as parent or as self)';

-- ============================================================================
-- 6. UPDATE RLS POLICIES FOR FAMILY-BASED ACCESS
-- ============================================================================

-- Drop existing user_id-based policies on data tables
DROP POLICY IF EXISTS "Users can view own schools" ON schools;
DROP POLICY IF EXISTS "Users can insert own schools" ON schools;
DROP POLICY IF EXISTS "Users can update own schools" ON schools;
DROP POLICY IF EXISTS "Users can delete own schools" ON schools;

DROP POLICY IF EXISTS "Users can view own coaches" ON coaches;
DROP POLICY IF EXISTS "Users can insert own coaches" ON coaches;
DROP POLICY IF EXISTS "Users can update own coaches" ON coaches;
DROP POLICY IF EXISTS "Users can delete own coaches" ON coaches;

-- Enable RLS on family_units and family_members
ALTER TABLE family_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- family_units RLS: Users can view units they belong to
CREATE POLICY "Users can view their family units" ON family_units
  FOR SELECT
  USING (
    id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- family_members RLS: Users can view members of their families
CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- user_notes RLS: Users can only access their own notes
CREATE POLICY "Users can view own notes" ON user_notes
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notes" ON user_notes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes" ON user_notes
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes" ON user_notes
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. NEW RLS POLICIES FOR DATA TABLES (FAMILY-BASED)
-- ============================================================================

-- schools: View any school in user's families
CREATE POLICY "Users can view schools in their families" ON schools
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- schools: Create school in user's family
CREATE POLICY "Users can create schools in their families" ON schools
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- schools: Update schools in user's families
CREATE POLICY "Users can update schools in their families" ON schools
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- schools: Delete only schools user created (user_id match)
CREATE POLICY "Users can delete own schools" ON schools
  FOR DELETE
  USING (user_id = auth.uid());

-- coaches: View any coach in user's families
CREATE POLICY "Users can view coaches in their families" ON coaches
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- coaches: Create coach in user's family
CREATE POLICY "Users can create coaches in their families" ON coaches
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- coaches: Update coaches in user's families
CREATE POLICY "Users can update coaches in their families" ON coaches
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- coaches: Delete only coaches user created
CREATE POLICY "Users can delete own coaches" ON coaches
  FOR DELETE
  USING (user_id = auth.uid());

-- interactions: View interactions in user's families
CREATE POLICY "Users can view interactions in their families" ON interactions
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- interactions: Only students can create interactions
CREATE POLICY "Only students can create interactions" ON interactions
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
    AND logged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM family_members
      WHERE user_id = auth.uid() AND role = 'student'
    )
  );

-- interactions: Users can update their own interactions
CREATE POLICY "Users can update own interactions" ON interactions
  FOR UPDATE
  USING (logged_by = auth.uid());

-- interactions: Users can delete their own interactions
CREATE POLICY "Users can delete own interactions" ON interactions
  FOR DELETE
  USING (logged_by = auth.uid());

-- documents: View documents in user's families
CREATE POLICY "Users can view documents in their families" ON documents
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- documents: Create document in user's family
CREATE POLICY "Users can create documents in their families" ON documents
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- documents: Update documents in user's families
CREATE POLICY "Users can update documents in their families" ON documents
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- documents: Delete only documents user uploaded
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE
  USING (user_id = auth.uid());

-- events: View events in user's families
CREATE POLICY "Users can view events in their families" ON events
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- events: Create event in user's family
CREATE POLICY "Users can create events in their families" ON events
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- events: Update events in user's families
CREATE POLICY "Users can update events in their families" ON events
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- events: Delete only events user created
CREATE POLICY "Users can delete own events" ON events
  FOR DELETE
  USING (user_id = auth.uid());

-- performance_metrics: View metrics in user's families
CREATE POLICY "Users can view performance metrics in their families" ON performance_metrics
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- performance_metrics: Create metric in user's family
CREATE POLICY "Users can create performance metrics in their families" ON performance_metrics
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- performance_metrics: Update metrics in user's families
CREATE POLICY "Users can update performance metrics in their families" ON performance_metrics
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- performance_metrics: Delete only metrics user created
CREATE POLICY "Users can delete own performance metrics" ON performance_metrics
  FOR DELETE
  USING (user_id = auth.uid());
