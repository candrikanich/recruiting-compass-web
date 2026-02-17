-- Add RLS Policies for Offers Table
-- Implements family-based access control for scholarship offers
-- Date: 2026-02-16

-- ============================================================================
-- ENABLE RLS ON OFFERS TABLE
-- ============================================================================

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ANY EXISTING USER_ID-BASED POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own offers" ON offers;
DROP POLICY IF EXISTS "Users can insert own offers" ON offers;
DROP POLICY IF EXISTS "Users can update own offers" ON offers;
DROP POLICY IF EXISTS "Users can delete own offers" ON offers;

-- ============================================================================
-- CREATE FAMILY-BASED RLS POLICIES FOR OFFERS
-- ============================================================================

-- SELECT: View offers in user's families
CREATE POLICY "Users can view offers in their families" ON offers
  FOR SELECT
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- INSERT: Create offer in user's family
CREATE POLICY "Users can create offers in their families" ON offers
  FOR INSERT
  WITH CHECK (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- UPDATE: Update offers in user's families
CREATE POLICY "Users can update offers in their families" ON offers
  FOR UPDATE
  USING (
    family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())
  );

-- DELETE: Delete only offers user created
CREATE POLICY "Users can delete own offers" ON offers
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================================

-- Index already exists from migration 021, but verify
CREATE INDEX IF NOT EXISTS idx_offers_family_unit_id ON offers(family_unit_id);

COMMENT ON POLICY "Users can view offers in their families" ON offers IS
  'Allow viewing offers for any family the user belongs to (students see their family, parents see all accessible families)';

COMMENT ON POLICY "Users can create offers in their families" ON offers IS
  'Allow creating offers in any family the user belongs to';

COMMENT ON POLICY "Users can update offers in their families" ON offers IS
  'Allow updating offers in any family the user belongs to';

COMMENT ON POLICY "Users can delete own offers" ON offers IS
  'Allow deleting only offers that the user created (user_id match)';
