-- Migration: Extend Users Table for Player Profile Onboarding
-- Purpose: Add player profile fields to support onboarding feature
-- Note: Uses users table as the central player profile entity (per actual schema)
-- Date: 2026-02-03
-- Dependencies: 028_create_sports_table.sql, 029_create_positions_table.sql, 030_add_onboarding_fields_to_users.sql

-- ============================================================================
-- 1. ADD PRIMARY SPORT FIELDS
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS primary_sport_id UUID REFERENCES sports(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.primary_sport_id IS 'Foreign key to sports table for primary sport';

-- ============================================================================
-- 2. ADD PRIMARY POSITION FIELDS
-- ============================================================================
-- primary_position_id: FK to positions table (for sports with fixed positions)
-- primary_position_custom: text field (for sports without position lists)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS primary_position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS primary_position_custom VARCHAR(100);

COMMENT ON COLUMN users.primary_position_id IS 'Foreign key to positions table for primary position (when sport has defined positions)';
COMMENT ON COLUMN users.primary_position_custom IS 'Free-text primary position (for sports without position list, e.g., track & field)';

-- ============================================================================
-- 3. ADD SECONDARY SPORT & POSITION FIELDS
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS secondary_sport_id UUID REFERENCES sports(id) ON DELETE SET NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS secondary_position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS secondary_position_custom VARCHAR(100);

COMMENT ON COLUMN users.secondary_sport_id IS 'Foreign key to sports table for secondary sport (optional)';
COMMENT ON COLUMN users.secondary_position_id IS 'Foreign key to positions table for secondary position (when sport has defined positions)';
COMMENT ON COLUMN users.secondary_position_custom IS 'Free-text secondary position (for sports without position list)';

-- ============================================================================
-- 4. ADD LOCATION FIELD
-- ============================================================================
-- zip_code: 5-digit US postal code for distance calculations

ALTER TABLE users
ADD COLUMN IF NOT EXISTS zip_code CHAR(5);

-- Add constraint: must be exactly 5 digits (numeric)
ALTER TABLE users
ADD CONSTRAINT zip_code_format_check CHECK (zip_code ~ '^\d{5}$' OR zip_code IS NULL);

CREATE INDEX IF NOT EXISTS idx_users_zip_code ON users(zip_code);

COMMENT ON COLUMN users.zip_code IS '5-digit US zip code for distance calculations (format: 12345)';

-- ============================================================================
-- 5. ADD ACADEMIC FIELDS
-- ============================================================================
-- gpa: GPA on 4.0 or 5.0 scale
-- sat_score: SAT score (optional, range: 400-1600)
-- act_score: ACT score (optional, range: 1-36)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS gpa DECIMAL(3, 2);

ALTER TABLE users
ADD CONSTRAINT gpa_range_check CHECK (gpa >= 0.0 AND gpa <= 5.0 OR gpa IS NULL);

CREATE INDEX IF NOT EXISTS idx_users_gpa ON users(gpa);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS sat_score INTEGER;

ALTER TABLE users
ADD CONSTRAINT sat_score_range_check CHECK (sat_score >= 400 AND sat_score <= 1600 OR sat_score IS NULL);

CREATE INDEX IF NOT EXISTS idx_users_sat_score ON users(sat_score);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS act_score INTEGER;

ALTER TABLE users
ADD CONSTRAINT act_score_range_check CHECK (act_score >= 1 AND act_score <= 36 OR act_score IS NULL);

CREATE INDEX IF NOT EXISTS idx_users_act_score ON users(act_score);

COMMENT ON COLUMN users.gpa IS 'GPA on 4.0 or 5.0 scale (optional)';
COMMENT ON COLUMN users.sat_score IS 'SAT score 400-1600 (optional)';
COMMENT ON COLUMN users.act_score IS 'ACT score 1-36 (optional)';

-- ============================================================================
-- 6. ADD PROFILE COMPLETENESS FIELD
-- ============================================================================
-- profile_completeness: Integer 0-100 representing percentage of profile completion
-- Calculated based on: graduation_year, primary_sport, primary_position, zip_code,
--                     gpa, test_scores, highlight_video, athletic_stats, contact_info
-- Updated via application logic or trigger

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

ALTER TABLE users
ADD CONSTRAINT profile_completeness_range_check CHECK (profile_completeness BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_users_profile_completeness ON users(profile_completeness);

COMMENT ON COLUMN users.profile_completeness IS 'Profile completion percentage 0-100; calculated from presence of key fields';

-- ============================================================================
-- 7. ADD INDEXES FOR ONBOARDING QUERIES
-- ============================================================================

-- Index for finding players by sport for analytics/recommendations
CREATE INDEX IF NOT EXISTS idx_users_primary_sport ON users(primary_sport_id) WHERE primary_sport_id IS NOT NULL;

-- Index for players in onboarding (incomplete profiles)
CREATE INDEX IF NOT EXISTS idx_users_incomplete_profiles ON users(onboarding_completed, profile_completeness)
  WHERE onboarding_completed = false AND user_type = 'player';

-- Index for academic filtering
CREATE INDEX IF NOT EXISTS idx_users_academic_profile ON users(gpa, sat_score, act_score)
  WHERE gpa IS NOT NULL OR sat_score IS NOT NULL OR act_score IS NOT NULL;

-- ============================================================================
-- 8. ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure graduation_year range is appropriate for high school students
ALTER TABLE users
DROP CONSTRAINT IF EXISTS graduation_year_range;

ALTER TABLE users
ADD CONSTRAINT graduation_year_range CHECK (graduation_year IS NULL OR (graduation_year BETWEEN 2024 AND 2040));

-- Ensure player-specific fields only apply to player accounts
-- Note: This is documented here; enforcement is at application level
COMMENT ON TABLE users IS 'Central user table; athletes own player profiles; parents can link to multiple player profiles';
