# Phase 7.1 Migration Application Guide

## Created Migrations

Four new migrations have been created to implement parent read-only access control via RLS policies:

1. **004_create_parent_view_helpers.sql** - Helper functions for role-based access
2. **005_athlete_task_parent_restrictions.sql** - RLS policies for athlete_task table
3. **006_interactions_parent_restrictions.sql** - RLS policies for interactions table
4. **007_parent_view_log_policies.sql** - RLS policies for parent_view_log table

## How to Apply Migrations

### Option 1: Supabase Web Console (Recommended for testing)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy the SQL from each migration file (004 → 007) in order
5. Run each query to apply it
6. Verify success message appears

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to web directory
cd web

# Apply migrations (Supabase CLI will auto-detect migrations directory)
supabase db push
```

### Option 3: Manual Application

Copy each migration file's content into the Supabase SQL Editor one at a time, in order:

1. Open 004_create_parent_view_helpers.sql
2. Copy all SQL to Supabase SQL Editor
3. Run and confirm success
4. Repeat for 005, 006, 007

## Testing the Migrations

After applying all migrations, verify they work:

### Test 1: Verify Helper Functions Exist

```sql
-- Check if helper functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_parent_viewing_linked_athlete', 'is_data_owner');
```

Expected: Should return 2 rows

### Test 2: Verify RLS Policies on athlete_task

```sql
-- Check policies on athlete_task
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'athlete_task'
ORDER BY policyname;
```

Expected: Should return 4 policies:
- Athletes can create own task records
- Athletes can delete own task records
- Athletes can update own task status
- Users can view own and linked athlete tasks

### Test 3: Verify RLS Policies on interactions

```sql
-- Check policies on interactions
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'interactions'
ORDER BY policyname;
```

Expected: Should return at least 4 policies including "Non-parents can" policies

### Test 4: Verify RLS Policies on parent_view_log

```sql
-- Check policies on parent_view_log
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'parent_view_log'
ORDER BY policyname;
```

Expected: Should return 3 policies:
- Athletes can view logs about themselves
- Parents can log views of linked athletes
- Parents can view their own logs

### Test 5: Verify RLS is Enabled

```sql
-- Verify RLS is enabled on all three tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('athlete_task', 'interactions', 'parent_view_log');
```

Expected: All three should have `rowsecurity = true`

## Functional Testing

After SQL verification, test the actual behavior:

### Test: Parent Cannot Update Task

1. Login as a **parent** with a linked athlete
2. Try to update a task via API: `PATCH /api/athlete-tasks/[taskId]`
3. Expected: **403 Forbidden** or RLS error
4. Verify database rejects the UPDATE via the RLS policy

### Test: Parent Can View Task

1. Login as a **parent** with a linked athlete
2. Try to view tasks via API: `GET /api/athlete-tasks`
3. Expected: **200 OK** with task data
4. Verify SELECT works through RLS policy

### Test: Parent Cannot Create Interaction

1. Login as a **parent** with a linked athlete
2. Try to create interaction via API: `POST /api/interactions`
3. Expected: **403 Forbidden** or RLS error

### Test: Athlete Can Update Task

1. Login as an **athlete**
2. Try to update a task via API: `PATCH /api/athlete-tasks/[taskId]`
3. Expected: **200 OK** - update succeeds
4. Verify athlete has full access

## Troubleshooting

### Error: "function does not exist"

**Cause**: Migration 004 didn't apply successfully
**Fix**: Re-run migration 004 before running 005-007

### Error: "policy already exists"

**Cause**: Policies were already created
**Fix**: Drop existing policies first:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

### Error: "permission denied for relation"

**Cause**: RLS policy is too restrictive
**Fix**: Check the policy conditions and verify `get_linked_user_ids()` function exists

### Parent can still modify tasks after migration

**Cause**: API route isn't using RLS (allowing direct mutation)
**Fix**: Ensure you're using Supabase client on client-side (which enforces RLS)
    Or add API-level guards in Phase 7.5

## Next Steps

After verifying these migrations work:

1. Proceed to Phase 7.2: View Logging System
2. Create `useViewLogging` composable
3. Add view logging middleware

See the implementation plan for Phase 7.2 details.
