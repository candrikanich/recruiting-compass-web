# Migration 022 - Validation & Next Steps

**Status:** Fixed - Ready to apply again

---

## What Was Fixed

Migration 022 had problematic SELECT statements that don't work in Supabase migrations. I've moved these validation queries into a commented section at the bottom of the file.

**Change:** Validation queries are now manual steps instead of auto-executed.

---

## How to Apply Migrations (Corrected)

### Step 1: Apply Migration 021

```sql
-- Open Supabase SQL Editor
-- Create New Query
-- Copy entire contents of: server/migrations/021_create_family_units.sql
-- Run
```

**Expected:** Success message. No output needed.

---

### Step 2: Apply Migration 022

```sql
-- Open Supabase SQL Editor
-- Create New Query
-- Copy entire contents of: server/migrations/022_backfill_family_data.sql
-- Run
```

**Expected:** Success message. Migration completes silently (just INSERT and UPDATE operations).

---

### Step 3: Validate Migration 022 (Manual)

After migration 022 succeeds, run these validation queries:

**Query 1: Check for missing family_unit_id**
```sql
-- Should return all zeros (no rows missing family_unit_id)
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
```

**Expected Result:** All rows show 0 (100% backfill coverage)

---

**Query 2: Verify family structure (1:1 student:family)**
```sql
-- Each student should have exactly 1 family
SELECT
  COUNT(*) as total_families,
  COUNT(DISTINCT student_user_id) as unique_students,
  CASE WHEN COUNT(*) = COUNT(DISTINCT student_user_id) THEN 'PASS' ELSE 'FAIL' END as validation
FROM family_units;
```

**Expected Result:** `total_families = unique_students` and `validation = PASS`

---

**Query 3: Check for data integrity issues**
```sql
-- Should return 0 rows if all families are valid
-- Returns any families that don't have exactly 1 student
SELECT
  family_unit_id,
  COUNT(*) as total_members,
  SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as student_count,
  SUM(CASE WHEN role = 'parent' THEN 1 ELSE 0 END) as parent_count
FROM family_members
GROUP BY family_unit_id
HAVING COUNT(*) < 1 OR SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) != 1;
```

**Expected Result:** 0 rows (all families valid)

---

**Query 4: Summary (shows what was created)**
```sql
-- Overview of migration success
SELECT
  (SELECT COUNT(*) FROM family_units) as family_units_created,
  (SELECT COUNT(*) FROM family_members WHERE role = 'student') as students_added,
  (SELECT COUNT(*) FROM family_members WHERE role = 'parent') as parents_added,
  (SELECT COUNT(*) FROM schools WHERE family_unit_id IS NOT NULL) as schools_backfilled,
  (SELECT COUNT(*) FROM coaches WHERE family_unit_id IS NOT NULL) as coaches_backfilled,
  (SELECT COUNT(*) FROM interactions WHERE family_unit_id IS NOT NULL) as interactions_backfilled;
```

**Expected Result:** Shows counts > 0 for created/backfilled items

---

### Step 4: Regenerate Database Types

After migrations succeed:

```bash
npx supabase gen types typescript --local > types/database.ts
```

This updates TypeScript definitions for new tables and columns.

---

### Step 5: Verify Code Compiles

```bash
npm run type-check
# Should show: ✅ PASS (0 errors)

npm run lint
# Should show: ✅ PASS (0 errors)
```

---

## Troubleshooting

### Error: "column does not exist"
- **Cause:** Migration 021 didn't apply successfully
- **Fix:** Run migration 021 again, check for error messages
- **Verify:** Run Query 2 (family_units) - if it fails, 021 didn't complete

### Error: "relation does not exist"
- **Cause:** One of the migrations failed
- **Fix:** Check migration execution order (021 must run before 022)

### Validation queries return unexpected results
- **Cause:** Data migration didn't complete properly
- **Fix:**
  1. Check Supabase Activity Log for errors
  2. Verify all CREATE TABLE statements succeeded (Query 1)
  3. Run migration 022 again

### Too many rows still missing family_unit_id
- **Cause:** Backfill didn't complete or had permission errors
- **Fix:**
  1. Verify current user has adequate permissions
  2. Check data volume (how many schools/coaches/etc exist)
  3. Try running individual UPDATE statements manually

---

## If Migrations Fail

### Option A: Rollback & Retry

1. Drop new tables:
   ```sql
   DROP TABLE IF EXISTS user_notes CASCADE;
   DROP TABLE IF EXISTS family_members CASCADE;
   DROP TABLE IF EXISTS family_units CASCADE;
   ```

2. Remove family_unit_id columns:
   ```sql
   ALTER TABLE schools DROP COLUMN IF EXISTS family_unit_id;
   ALTER TABLE coaches DROP COLUMN IF EXISTS family_unit_id;
   -- etc for all tables
   ```

3. Drop helper functions:
   ```sql
   DROP FUNCTION IF EXISTS get_user_family_ids();
   DROP FUNCTION IF EXISTS get_primary_family_id();
   DROP FUNCTION IF EXISTS is_parent_viewing_athlete(UUID);
   DROP FUNCTION IF EXISTS get_accessible_athletes();
   ```

4. Re-apply migrations

### Option B: Restore from Backup

Supabase → Backups → Restore to point before migration attempt

---

## Success Checklist

- [ ] Migration 021 applied successfully
- [ ] Migration 022 applied successfully
- [ ] All 4 validation queries run and show expected results
- [ ] `npx supabase gen types typescript --local > types/database.ts` succeeds
- [ ] `npm run type-check` shows 0 errors
- [ ] `npm run lint` shows 0 errors

---

## Next Steps After Successful Migration

1. ✅ Migrations applied and validated
2. ⏳ Update remaining composables (useCoaches, useInteractions, useAccountLinks)
3. ⏳ Build UI components (AthleteSelector, PrivateNotesCard)
4. ⏳ Create API endpoints
5. ⏳ Comprehensive testing

See `PHASE_4_NEXT_STEPS.md` for detailed implementation guide.

---

## Questions?

- **Validation queries location?** Bottom of `022_backfill_family_data.sql` (commented out)
- **How long does migration take?** ~1-2 minutes for typical dataset
- **Is it safe?** Yes - backup tables created automatically
- **Can I rollback?** Yes - backup tables retained for 24-48 hours
