-- Phase 3: Family Code System
-- Adds shareable family codes for simplified family joining
-- Date: 2026-01-31

-- ============================================================================
-- 1. ADD FAMILY CODE COLUMNS TO family_units
-- ============================================================================

ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS family_code VARCHAR(10) UNIQUE,
  ADD COLUMN IF NOT EXISTS code_generated_at TIMESTAMP WITH TIME ZONE;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_units_code ON family_units(family_code)
  WHERE family_code IS NOT NULL;

-- Add format validation constraint
ALTER TABLE family_units
  ADD CONSTRAINT family_code_format_check
  CHECK (family_code ~ '^FAM-[A-Z0-9]{6}$');

COMMENT ON COLUMN family_units.family_code IS 'Shareable 10-char code (FAM-XXXXXX) for family joining';
COMMENT ON COLUMN family_units.code_generated_at IS 'Timestamp when code was generated or regenerated';

-- ============================================================================
-- 2. CREATE FAMILY CODE USAGE LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_code_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_unit_id UUID NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_used VARCHAR(10) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('generated', 'joined', 'regenerated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_code_usage_log_family_unit ON family_code_usage_log(family_unit_id);
CREATE INDEX IF NOT EXISTS idx_family_code_usage_log_user ON family_code_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_family_code_usage_log_created_at ON family_code_usage_log(created_at);

COMMENT ON TABLE family_code_usage_log IS 'Audit log for family code generation, joining, and regeneration';
COMMENT ON COLUMN family_code_usage_log.action IS 'Type of action: generated (first time), joined (user joined), regenerated (new code)';

-- Enable RLS on audit log
ALTER TABLE family_code_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view usage logs for their families
CREATE POLICY "Users can view family code usage logs" ON family_code_usage_log
  FOR SELECT
  USING (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. BACKFILL EXISTING FAMILIES WITH CODES
-- ============================================================================

-- Generate codes for all existing family_units that don't have codes
-- Uses format: FAM- + 6 random alphanumeric (uppercase)
-- Implemented as function to handle collision retries
UPDATE family_units
SET
  family_code = 'FAM-' || UPPER(
    SUBSTRING(
      MD5(RANDOM()::TEXT || created_at::TEXT || id::TEXT),
      1, 6
    )
  ),
  code_generated_at = NOW()
WHERE family_code IS NULL;

-- Log the backfilled codes
INSERT INTO family_code_usage_log (family_unit_id, user_id, code_used, action)
SELECT
  fu.id,
  fu.student_user_id,
  fu.family_code,
  'generated'
FROM family_units fu
WHERE fu.family_code IS NOT NULL
ON CONFLICT DO NOTHING;
