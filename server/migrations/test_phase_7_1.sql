-- Test Script for Phase 7.1 RLS Migrations
-- Run this after applying migrations 004-007 to verify they're working correctly

-- ============================================
-- 1. Verify Helper Functions Exist
-- ============================================
SELECT
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_parent_viewing_linked_athlete', 'is_data_owner')
ORDER BY routine_name;
-- Expected: 2 rows

-- ============================================
-- 2. Verify RLS is Enabled on All Tables
-- ============================================
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('athlete_task', 'interactions', 'parent_view_log')
ORDER BY tablename;
-- Expected: All 3 tables should have rowsecurity = true

-- ============================================
-- 3. Count RLS Policies on athlete_task
-- ============================================
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'athlete_task'
GROUP BY schemaname, tablename;
-- Expected: 4 policies on athlete_task

-- ============================================
-- 4. Count RLS Policies on interactions
-- ============================================
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'interactions'
GROUP BY schemaname, tablename;
-- Expected: 4 policies on interactions

-- ============================================
-- 5. Count RLS Policies on parent_view_log
-- ============================================
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'parent_view_log'
GROUP BY schemaname, tablename;
-- Expected: 3 policies on parent_view_log

-- ============================================
-- 6. Summary: Total Policy Count
-- ============================================
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('athlete_task', 'interactions', 'parent_view_log')
GROUP BY tablename
ORDER BY tablename;
-- Expected:
-- athlete_task: 4 policies
-- interactions: 4 policies
-- parent_view_log: 3 policies

-- ============================================
-- 7. List All Policies (basic check)
-- ============================================
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('athlete_task', 'interactions', 'parent_view_log');
-- Expected: 11 total policies (4+4+3)

-- ============================================
-- Test Results Summary
-- ============================================
-- If all queries above return expected results:
-- ✅ Migration 004 successful (2 functions created)
-- ✅ Migration 005 successful (4 athlete_task policies)
-- ✅ Migration 006 successful (4 interactions policies)
-- ✅ Migration 007 successful (3 parent_view_log policies)
-- ✅ RLS enforcement is enabled on all 3 tables
-- ✅ Ready to proceed to Phase 7.2: View Logging System
