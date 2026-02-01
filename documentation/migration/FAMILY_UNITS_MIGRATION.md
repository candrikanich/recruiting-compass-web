# Family Unit System Migration Guide

**Date:** 2026-01-31
**Migrations:** 021 (Schema), 022 (Data)
**Status:** Ready for application

---

## Overview

This migration introduces the **Family Unit System**, enabling:

- Family-based data ownership (1 student + N parents per family)
- Parent access to all student data (read/write schools, coaches, notes)
- Student-only interaction creation (enforced via RLS)
- Private user notes (per-user only, not shared)

---

## Migrations to Apply

### Migration 021: Create Family Units Schema

**File:** `server/migrations/021_create_family_units.sql`
**Duration:** ~2-3 minutes
**Actions:**

1. Creates `family_units` table (1 student + N parents)
2. Creates `family_members` table (user → family mapping)
3. Creates `user_notes` table (private per-user notes)
4. Adds `family_unit_id` columns to: schools, coaches, interactions, documents, events, performance_metrics, offers
5. Creates helper functions:
   - `get_user_family_ids()` - Returns families user belongs to
   - `get_primary_family_id()` - Returns primary family (for UI context)
   - `is_parent_viewing_athlete()` - Check parent access
   - `get_accessible_athletes()` - List athletes parent can access
6. Creates family-based RLS policies for all data tables

### Migration 022: Backfill Family Data

**File:** `server/migrations/022_backfill_family_data.sql`
**Duration:** ~1-2 minutes
**Actions:**

1. Creates backup tables (pre-migration safety)
2. Creates family unit for each student
3. Adds students to family_members
4. Adds parents from accepted account_links
5. Backfills `family_unit_id` on all data tables

**Validation:** See "Validation Results" section below for queries to run AFTER migration succeeds

---

## How to Apply Migrations

### Option 1: Supabase Web Console (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. **Copy entire contents of `021_create_family_units.sql`**
5. Click **Run** and wait for completion
6. **Copy entire contents of `022_backfill_family_data.sql`**
7. Click **Run** and wait for completion
8. See "Validation Results" section below to verify

### Option 2: Supabase CLI

```bash
cd recruiting-compass-web

# Ensure CLI is authenticated
supabase link --project-ref YOUR_PROJECT_ID

# Push migrations (auto-discovers server/migrations/)
supabase db push
```

### Option 3: Docker/Local Environment

If running Supabase locally:

```bash
# Start local Supabase
supabase start

# Migrations auto-apply on startup
supabase db reset  # If needed to reset

# View migrations applied
supabase migration list
```

---

## Pre-Migration Checklist

Before applying migrations:

- [ ] Backup Supabase database (Supabase Dashboard → Backups)
- [ ] Verify no deployments in progress
- [ ] Test in **staging environment first** if possible
- [ ] Document baseline counts:
  ```sql
  SELECT COUNT(*) FROM users WHERE role = 'student';
  SELECT COUNT(*) FROM account_links WHERE status IN ('accepted', 'pending_confirmation');
  SELECT COUNT(*) FROM schools;
  SELECT COUNT(*) FROM coaches;
  ```

---

## Validation Results

### After Migration 021 (Schema)

Run these checks in Supabase SQL Editor:

#### 1. Check new tables exist

```sql
SELECT tablename FROM pg_tables
WHERE tablename IN ('family_units', 'family_members', 'user_notes')
ORDER BY tablename;
```

**Expected:** 3 rows (family_members, family_units, user_notes)

#### 2. Check new columns exist

```sql
SELECT tablename, attname
FROM pg_attribute
JOIN pg_class ON pg_class.oid = attrelid
JOIN pg_tables ON pg_tables.tablename = pg_class.relname
WHERE tablename IN ('schools', 'coaches', 'interactions', 'documents', 'events', 'performance_metrics')
AND attname = 'family_unit_id'
ORDER BY tablename;
```

**Expected:** 6 rows (one for each table)

#### 3. Check helper functions created

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_family_ids',
  'get_primary_family_id',
  'is_parent_viewing_athlete',
  'get_accessible_athletes'
)
ORDER BY routine_name;
```

**Expected:** 4 rows

#### 4. Check RLS policies created

```sql
SELECT DISTINCT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('schools', 'coaches', 'interactions', 'family_units', 'family_members', 'user_notes')
GROUP BY tablename
ORDER BY tablename;
```

**Expected:** All tables should have policies:

- family_units: 1
- family_members: 1
- user_notes: 4
- schools: 4
- coaches: 4
- interactions: 4
- documents: 4
- events: 4
- performance_metrics: 4

### After Migration 022 (Data Backfill)

After the migration completes successfully, run the validation queries below in Supabase SQL Editor to verify data integrity. These queries are provided in the migration file as comments.

#### 1. Family units created

```sql
SELECT COUNT(*) as family_units_count
FROM family_units;
```

**Expected:** Should equal count of students from pre-migration

#### 2. All data backfilled

```sql
SELECT
  (SELECT COUNT(*) FROM schools WHERE family_unit_id IS NULL) as schools_missing,
  (SELECT COUNT(*) FROM coaches WHERE family_unit_id IS NULL) as coaches_missing,
  (SELECT COUNT(*) FROM interactions WHERE family_unit_id IS NULL) as interactions_missing,
  (SELECT COUNT(*) FROM documents WHERE family_unit_id IS NULL) as documents_missing,
  (SELECT COUNT(*) FROM events WHERE family_unit_id IS NULL) as events_missing,
  (SELECT COUNT(*) FROM performance_metrics WHERE family_unit_id IS NULL) as metrics_missing;
```

**Expected:** All zeros (0) - 100% backfill coverage

#### 3. Family structure integrity

```sql
-- Each student should have exactly 1 family
SELECT
  'Integrity check: Student to Family' as check_name,
  (SELECT COUNT(DISTINCT student_user_id) FROM family_units) as students,
  (SELECT COUNT(*) FROM family_units) as families,
  CASE
    WHEN (SELECT COUNT(*) FROM family_units) = (SELECT COUNT(DISTINCT student_user_id) FROM family_units)
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;
```

**Expected:** PASS (1:1 relationship)

#### 4. Sample family data

```sql
SELECT
  fu.family_name,
  (SELECT COUNT(*) FROM family_members fm WHERE fm.family_unit_id = fu.id AND role = 'student') as students,
  (SELECT COUNT(*) FROM family_members fm WHERE fm.family_unit_id = fu.id AND role = 'parent') as parents,
  (SELECT COUNT(*) FROM schools WHERE family_unit_id = fu.id) as schools,
  (SELECT COUNT(*) FROM coaches WHERE family_unit_id = fu.id) as coaches
FROM family_units fu
LIMIT 5;
```

**Expected:** Show sample families with expected data

---

## Post-Migration Steps

### Step 1: Regenerate Database Types

After migrations are applied successfully, regenerate TypeScript types:

```bash
# From project root
npx supabase gen types typescript --local > types/database.ts
```

This updates type definitions for new tables and columns.

### Step 2: Verify RLS is Working

Test RLS policies with SQL query:

```sql
-- Test as student viewing their own schools
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "STUDENT_USER_ID"}';

SELECT * FROM schools
WHERE family_unit_id IN (SELECT * FROM get_user_family_ids());
```

### Step 3: Create Composables

After verification, implement Phase 4 composables:

- `useActiveFamily()` - Family context provider
- `useUserNotes()` - Private notes CRUD
- Update `useSchools()`, `useCoaches()`, `useInteractions()` for family queries

### Step 4: Run Full Test Suite

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run type-check    # TypeScript
npm run lint          # ESLint
```

---

## Rollback Plan (If Issues Detected)

If problems occur within 24 hours:

### Step 1: Disable RLS on data tables

```sql
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics DISABLE ROW LEVEL SECURITY;
```

### Step 2: Drop new tables (if needed)

```sql
DROP TABLE IF EXISTS user_notes CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS family_units CASCADE;
```

### Step 3: Revert column additions

```sql
ALTER TABLE schools DROP COLUMN IF EXISTS family_unit_id;
ALTER TABLE coaches DROP COLUMN IF EXISTS family_unit_id;
ALTER TABLE interactions DROP COLUMN IF EXISTS family_unit_id;
ALTER TABLE documents DROP COLUMN IF EXISTS family_unit_id;
ALTER TABLE events DROP COLUMN IF EXISTS family_unit_id;
ALTER TABLE performance_metrics DROP COLUMN IF EXISTS family_unit_id;
```

### Step 4: Drop helper functions

```sql
DROP FUNCTION IF EXISTS get_user_family_ids();
DROP FUNCTION IF EXISTS get_primary_family_id();
DROP FUNCTION IF EXISTS is_parent_viewing_athlete(UUID);
DROP FUNCTION IF EXISTS get_accessible_athletes();
```

### Step 5: Restore from backup

Restore backup tables if data corruption occurs:

```sql
-- Restore schools
DROP TABLE schools;
CREATE TABLE schools AS SELECT * FROM schools_backup_pre_family;

-- Restore coaches
DROP TABLE coaches;
CREATE TABLE coaches AS SELECT * FROM coaches_backup_pre_family;

-- Repeat for other tables as needed
```

---

## Troubleshooting

### Error: "function does not exist: get_user_family_ids"

**Cause:** Migration 021 didn't complete successfully
**Fix:**

1. Check Supabase SQL Editor for error messages
2. Re-run migration 021 from beginning
3. Verify helper function section executed

### Error: "column family_unit_id does not exist"

**Cause:** Migration 021 schema creation failed
**Fix:**

1. Run migration 021 SQL again
2. Check for syntax errors in output
3. Try smaller sections if query is too large

### Error: "duplicate key value violates unique constraint idx_student_one_family"

**Cause:** A student somehow exists in multiple families (data corruption before migration)
**Fix:**

1. Check for duplicate family_members:
   ```sql
   SELECT user_id, COUNT(*) FROM family_members
   WHERE role = 'student'
   GROUP BY user_id HAVING COUNT(*) > 1;
   ```
2. Manually remove duplicates before retrying migration
3. Contact support if issue persists

### RLS policies block all queries

**Cause:** `get_user_family_ids()` function has permission issue
**Fix:**

1. Drop and recreate function with SECURITY DEFINER:
   ```sql
   DROP FUNCTION IF EXISTS get_user_family_ids();
   CREATE OR REPLACE FUNCTION get_user_family_ids()
   RETURNS TABLE(family_unit_id UUID) AS $$
   BEGIN
     RETURN QUERY
     SELECT fm.family_unit_id
     FROM family_members fm
     WHERE fm.user_id = auth.uid();
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
   ```

---

## Performance Notes

- `get_user_family_ids()` is marked `STABLE` for query optimization
- Indexes created on all `family_unit_id` columns
- RLS policy performance: ~5-10ms overhead per query
- Monitor slow query log if response times increase > 20%

---

## Success Criteria

- [ ] Migration 021 applies without errors
- [ ] Migration 022 applies without errors
- [ ] All validation checks pass (100% family_unit_id coverage)
- [ ] Helper functions accessible
- [ ] RLS policies active on all tables
- [ ] Database types regenerated (`types/database.ts`)
- [ ] Existing tests still pass
- [ ] No data loss (backup tables present)

---

## Next Steps

Once migrations are verified:

1. **Phase 3:** Update RLS enforcement (already included in migration 021)
2. **Phase 4:** Build composables (`useActiveFamily`, `useUserNotes`)
3. **Phase 5:** Update UI components (AthleteSelector, notes cards)
4. **Phase 6:** Create API endpoints for family management
5. **Phase 7:** Comprehensive testing (unit, integration, E2E)

See main implementation plan for details.
