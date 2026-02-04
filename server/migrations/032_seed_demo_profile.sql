-- Migration: Seed Demo Profile for Preview Mode
-- Purpose: Create demo player account and sample data for parent preview mode
-- Demo data allows parents to explore app features before player signup
-- Date: 2026-02-03
-- Dependencies: 028_create_sports_table.sql, 029_create_positions_table.sql,
--               030_add_onboarding_fields_to_users.sql, 031_extend_users_for_onboarding.sql

-- ============================================================================
-- 1. CREATE DEMO PLAYER ACCOUNT
-- ============================================================================
-- Demo player: "Alex Demo"
-- Email: demo-player@recruiting-compass.app (will not receive real auth emails)
-- user_type: 'player' (so field structure matches player profile)
-- is_preview_mode: false (this is the real demo player profile)
-- onboarding_completed: true (demo player has completed onboarding)

-- Note: In practice, this user will be created via Supabase Auth first
-- For this migration, we assume the user exists; use INSERT ... ON CONFLICT to handle idempotency
-- The auth.users record must be created separately through Supabase Auth

INSERT INTO users (
  id,
  email,
  full_name,
  user_type,
  onboarding_completed,
  is_preview_mode,
  role,
  current_phase,
  graduation_year,
  primary_sport_id,
  primary_position_id,
  zip_code,
  gpa,
  profile_completeness,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo-player@recruiting-compass.app',
  'Alex Demo',
  'player',
  true,
  false,
  'student',
  'junior',
  EXTRACT(YEAR FROM NOW())::INTEGER + 1, -- Current year + 1 (junior)
  (SELECT id FROM sports WHERE name = 'Soccer'),
  (SELECT id FROM positions WHERE sport_id = (SELECT id FROM sports WHERE name = 'Soccer') AND name = 'Midfielder'),
  '44138',
  3.5,
  65,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Log the demo user creation
COMMENT ON COLUMN users.is_preview_mode IS 'True if parent is viewing demo profile (Alex Demo); false for real player profiles';

-- ============================================================================
-- 2. CREATE DEMO FAMILY UNIT
-- ============================================================================
-- Family unit for demo player to store family code for preview mode

INSERT INTO family_units (
  id,
  student_user_id,
  family_name,
  family_code,
  code_generated_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Family',
  'FAM-DEMO01',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. CREATE DEMO FAMILY MEMBER RECORD
-- ============================================================================
-- Add demo player to family unit

INSERT INTO family_members (
  id,
  family_unit_id,
  user_id,
  role,
  added_at
)
VALUES (
  '00000000-0000-0000-0000-000000000101'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'student',
  NOW()
)
ON CONFLICT (family_unit_id, user_id) DO NOTHING;

-- ============================================================================
-- 4. CREATE DEMO SCHOOLS
-- ============================================================================

INSERT INTO schools (
  id,
  user_id,
  family_unit_id,
  name,
  division,
  distance_miles,
  status,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000201'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    'Ohio State University',
    'D1',
    140,
    'Following',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000202'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    'John Carroll University',
    'D3',
    18,
    'Researching',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000203'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    'University of Akron',
    'D1',
    32,
    'Following',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000204'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    'Oberlin College',
    'D3',
    25,
    'Contacted',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. CREATE DEMO COACHES
-- ============================================================================

INSERT INTO coaches (
  id,
  user_id,
  family_unit_id,
  school_id,
  first_name,
  last_name,
  title,
  email,
  phone,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000301'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    '00000000-0000-0000-0000-000000000201'::uuid,
    'Jamie',
    'Smith',
    'head',
    'demo@example.com',
    '(555) 123-4567',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000302'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    '00000000-0000-0000-0000-000000000202'::uuid,
    'Taylor',
    'Johnson',
    'assistant',
    'demo@example.com',
    '(555) 234-5678',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000303'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000100'::uuid,
    '00000000-0000-0000-0000-000000000204'::uuid,
    'Morgan',
    'Davis',
    'recruiting',
    'demo@example.com',
    '(555) 345-6789',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. CREATE DEMO INTERACTIONS
-- ============================================================================

-- Sample interaction 1: Email sent to Ohio State
INSERT INTO interactions (
  id,
  user_id,
  family_unit_id,
  school_id,
  coach_id,
  interaction_type,
  notes,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000401'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000201'::uuid,
  '00000000-0000-0000-0000-000000000301'::uuid,
  'email_sent',
  'Sent intro email with highlight video',
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '14 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample interaction 2: Email received from Ohio State
INSERT INTO interactions (
  id,
  user_id,
  family_unit_id,
  school_id,
  coach_id,
  interaction_type,
  notes,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000402'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000201'::uuid,
  '00000000-0000-0000-0000-000000000301'::uuid,
  'email_received',
  'Coach requested academic info',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample interaction 3: Camp registration at John Carroll
INSERT INTO interactions (
  id,
  user_id,
  family_unit_id,
  school_id,
  interaction_type,
  notes,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000403'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000202'::uuid,
  'event_registered',
  'Summer ID camp, June 15-17',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample interaction 4: Call scheduled with Oberlin coach
INSERT INTO interactions (
  id,
  user_id,
  family_unit_id,
  school_id,
  coach_id,
  interaction_type,
  notes,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000404'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000204'::uuid,
  '00000000-0000-0000-0000-000000000303'::uuid,
  'call_scheduled',
  'Phone call set for next Tuesday',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample interaction 5: Campus visit to University of Akron
INSERT INTO interactions (
  id,
  user_id,
  family_unit_id,
  school_id,
  interaction_type,
  notes,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000405'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000203'::uuid,
  'campus_visit',
  'Unofficial visit, toured facilities',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. SEED FAMILY CODE USAGE LOG FOR DEMO
-- ============================================================================

INSERT INTO family_code_usage_log (
  id,
  family_unit_id,
  user_id,
  code_used,
  action,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000501'::uuid,
  '00000000-0000-0000-0000-000000000100'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'FAM-DEMO01',
  'generated',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE family_units IS 'Family unit: 1 student + N parents. Demo family stores demo player and family code.';
COMMENT ON TABLE family_members IS 'Maps users to family units. Demo player is member of demo family unit.';
COMMENT ON TABLE family_code_usage_log IS 'Audit log for family code generation. Demo code usage logged here.';

-- ============================================================================
-- 9. IDEMPOTENCY NOTES
-- ============================================================================
-- All inserts use ON CONFLICT DO NOTHING for idempotency
-- This migration can be run multiple times safely
-- If demo data needs to be refreshed, delete records by UUID prefix 00000000-0000-0000-0000-00
-- and re-run migration
