-- Phase 2: Family Unit Data Migration
-- Populates family_units and family_members with existing user data
-- Backfills family_unit_id on all data tables
-- Date: 2026-01-31

-- ============================================================================
-- SAFETY: Create backups of original data before migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools_backup_pre_family AS
SELECT * FROM schools;

CREATE TABLE IF NOT EXISTS coaches_backup_pre_family AS
SELECT * FROM coaches;

CREATE TABLE IF NOT EXISTS interactions_backup_pre_family AS
SELECT * FROM interactions;

CREATE TABLE IF NOT EXISTS events_backup_pre_family AS
SELECT * FROM events;

CREATE TABLE IF NOT EXISTS documents_backup_pre_family AS
SELECT * FROM documents;

CREATE TABLE IF NOT EXISTS performance_metrics_backup_pre_family AS
SELECT * FROM performance_metrics;

-- ============================================================================
-- 1. CREATE FAMILY UNITS FOR EACH STUDENT
-- ============================================================================

INSERT INTO family_units (student_user_id, family_name, created_at, updated_at)
SELECT
  id,
  full_name || '''s Family' as family_name,
  NOW() as created_at,
  NOW() as updated_at
FROM users
WHERE role = 'student'
ON CONFLICT (student_user_id) DO NOTHING;

-- ============================================================================
-- 2. ADD STUDENTS TO THEIR FAMILY UNITS
-- ============================================================================

INSERT INTO family_members (family_unit_id, user_id, role, added_at)
SELECT
  fu.id,
  fu.student_user_id,
  'student',
  NOW()
FROM family_units fu
ON CONFLICT (family_unit_id, user_id) DO NOTHING;

-- ============================================================================
-- 3. ADD PARENTS FROM ACCEPTED ACCOUNT LINKS
-- ============================================================================
-- Only add parents where account_links status is 'accepted' or 'pending_confirmation'
-- These represent confirmed family relationships

INSERT INTO family_members (family_unit_id, user_id, role, added_at)
SELECT DISTINCT
  fu.id,
  COALESCE(al.parent_user_id, al.initiator_user_id) as parent_id,
  'parent',
  COALESCE(al.confirmed_at, al.accepted_at, NOW()) as added_at
FROM family_units fu
JOIN account_links al ON (
  (fu.student_user_id = al.player_user_id AND al.parent_user_id IS NOT NULL) OR
  (fu.student_user_id = al.initiator_user_id AND al.parent_user_id IS NOT NULL AND al.relationship_type IN ('parent-parent', 'player-parent'))
)
WHERE al.status IN ('accepted', 'pending_confirmation')
ON CONFLICT (family_unit_id, user_id) DO NOTHING;

-- ============================================================================
-- 4. BACKFILL family_unit_id FOR SCHOOLS
-- ============================================================================

UPDATE schools s
SET family_unit_id = fu.id
FROM family_units fu
WHERE s.user_id = fu.student_user_id
  AND s.family_unit_id IS NULL;

-- Log backfill results
SELECT
  'schools' as table_name,
  COUNT(*) as rows_updated,
  (SELECT COUNT(*) FROM schools WHERE family_unit_id IS NOT NULL) as total_with_family_id,
  (SELECT COUNT(*) FROM schools) as total_rows
FROM schools
WHERE family_unit_id IS NOT NULL;

-- ============================================================================
-- 5. BACKFILL family_unit_id FOR COACHES
-- ============================================================================

UPDATE coaches c
SET family_unit_id = fu.id
FROM family_units fu
WHERE c.user_id = fu.student_user_id
  AND c.family_unit_id IS NULL;

SELECT
  'coaches' as table_name,
  COUNT(*) as rows_updated,
  (SELECT COUNT(*) FROM coaches WHERE family_unit_id IS NOT NULL) as total_with_family_id,
  (SELECT COUNT(*) FROM coaches) as total_rows
FROM coaches
WHERE family_unit_id IS NOT NULL;

-- ============================================================================
-- 6. BACKFILL family_unit_id FOR INTERACTIONS
-- ============================================================================

UPDATE interactions i
SET family_unit_id = fu.id
FROM family_units fu
WHERE i.logged_by = fu.student_user_id
  AND i.family_unit_id IS NULL;

SELECT
  'interactions' as table_name,
  COUNT(*) as rows_updated,
  (SELECT COUNT(*) FROM interactions WHERE family_unit_id IS NOT NULL) as total_with_family_id,
  (SELECT COUNT(*) FROM interactions) as total_rows
FROM interactions
WHERE family_unit_id IS NOT NULL;

-- ============================================================================
-- 7. BACKFILL family_unit_id FOR DOCUMENTS
-- ============================================================================

UPDATE documents d
SET family_unit_id = fu.id
FROM family_units fu
WHERE d.user_id = fu.student_user_id
  AND d.family_unit_id IS NULL;

SELECT
  'documents' as table_name,
  COUNT(*) as rows_updated,
  (SELECT COUNT(*) FROM documents WHERE family_unit_id IS NOT NULL) as total_with_family_id,
  (SELECT COUNT(*) FROM documents) as total_rows
FROM documents
WHERE family_unit_id IS NOT NULL;

-- ============================================================================
-- 8. BACKFILL family_unit_id FOR EVENTS
-- ============================================================================

UPDATE events e
SET family_unit_id = fu.id
FROM family_units fu
WHERE e.user_id = fu.student_user_id
  AND e.family_unit_id IS NULL;

SELECT
  'events' as table_name,
  COUNT(*) as rows_updated,
  (SELECT COUNT(*) FROM events WHERE family_unit_id IS NOT NULL) as total_with_family_id,
  (SELECT COUNT(*) FROM events) as total_rows
FROM events
WHERE family_unit_id IS NOT NULL;

-- ============================================================================
-- 9. BACKFILL family_unit_id FOR PERFORMANCE_METRICS
-- ============================================================================

UPDATE performance_metrics pm
SET family_unit_id = fu.id
FROM family_units fu
WHERE pm.user_id = fu.student_user_id
  AND pm.family_unit_id IS NULL;

SELECT
  'performance_metrics' as table_name,
  COUNT(*) as rows_updated,
  (SELECT COUNT(*) FROM performance_metrics WHERE family_unit_id IS NOT NULL) as total_with_family_id,
  (SELECT COUNT(*) FROM performance_metrics) as total_rows
FROM performance_metrics
WHERE family_unit_id IS NOT NULL;

-- ============================================================================
-- 10. VALIDATION QUERIES (Run these manually after migration)
-- ============================================================================
-- These queries verify data integrity. Run them in Supabase SQL Editor after migration completes.
-- Expected results:
-- - schools missing family_id: 0
-- - coaches missing family_id: 0
-- - interactions missing family_id: 0
-- - All other tables: 0 missing
-- - family_units count should equal COUNT(DISTINCT student_user_id)
-- - Each family should have exactly 1 student

/*
-- COPY AND RUN THESE QUERIES MANUALLY IN SUPABASE SQL EDITOR:

-- Verify 100% family_unit_id coverage
SELECT
  'schools' as table_name,
  COUNT(*) as rows_missing_family_id
FROM schools
WHERE family_unit_id IS NULL
UNION ALL
SELECT 'coaches', COUNT(*) FROM coaches WHERE family_unit_id IS NULL
UNION ALL
SELECT 'interactions', COUNT(*) FROM interactions WHERE family_unit_id IS NULL
UNION ALL
SELECT 'documents', COUNT(*) FROM documents WHERE family_unit_id IS NULL
UNION ALL
SELECT 'events', COUNT(*) FROM events WHERE family_unit_id IS NULL
UNION ALL
SELECT 'performance_metrics', COUNT(*) FROM performance_metrics WHERE family_unit_id IS NULL;

-- Verify family structure (1:1 student:family)
SELECT
  COUNT(*) as total_families,
  COUNT(DISTINCT student_user_id) as unique_students,
  CASE WHEN COUNT(*) = COUNT(DISTINCT student_user_id) THEN 'PASS' ELSE 'FAIL' END as validation
FROM family_units;

-- Verify each family has exactly 1 student
SELECT
  family_unit_id,
  COUNT(*) as member_count,
  SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as student_count,
  SUM(CASE WHEN role = 'parent' THEN 1 ELSE 0 END) as parent_count
FROM family_members
GROUP BY family_unit_id
HAVING COUNT(*) < 1 OR SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) != 1;

-- Summary: Should show your family creation results
SELECT
  (SELECT COUNT(*) FROM family_units) as family_units_created,
  (SELECT COUNT(*) FROM family_members WHERE role = 'student') as students_added,
  (SELECT COUNT(*) FROM family_members WHERE role = 'parent') as parents_added,
  (SELECT COUNT(*) FROM schools WHERE family_unit_id IS NOT NULL) as schools_backfilled,
  (SELECT COUNT(*) FROM coaches WHERE family_unit_id IS NOT NULL) as coaches_backfilled;
*/
