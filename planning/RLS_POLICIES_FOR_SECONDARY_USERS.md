# RLS Policies for Secondary User Access - User Story 1.3

## Status Summary

**Good News**: Interactions and athlete_task tables already have RLS policies in place from migrations 005-006!

**Action Items**:

1. ✅ Create `get_linked_user_ids()` helper function (may be missing)
2. ✅ Create RLS policies for **schools** table
3. ⚠️ Decide on **coaches** table approach (needs user_id column or indirect RLS)

---

## Database Schema Reference

| Table        | User Column         | Ownership       | Has RLS    | Status                  |
| ------------ | ------------------- | --------------- | ---------- | ----------------------- |
| schools      | `user_id` (UUID)    | Direct          | ❌ MISSING | Action required         |
| coaches      | ❌ None             | Via `school_id` | ❌ MISSING | **Requires decision**   |
| interactions | Via `school_id`     | Indirect        | ✅ EXISTS  | Read-only for parents ✓ |
| athlete_task | `athlete_id` (UUID) | Direct          | ✅ EXISTS  | Athletes only ✓         |

---

## Step 1: Create Helper Function

This function enables RLS policies to access linked accounts:

```sql
-- Check if function exists before creating
CREATE OR REPLACE FUNCTION public.get_linked_user_ids()
RETURNS TABLE(user_id UUID) AS $$
BEGIN
  RETURN QUERY
  -- Include self
  SELECT auth.uid() AS user_id
  UNION ALL
  -- Include linked account users (both directions)
  SELECT player_user_id AS user_id
  FROM account_links
  WHERE parent_user_id = auth.uid()
  AND status = 'accepted'
  UNION ALL
  SELECT parent_user_id AS user_id
  FROM account_links
  WHERE player_user_id = auth.uid()
  AND status = 'accepted';
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_linked_user_ids TO authenticated;
```

---

## Step 2: Create RLS Policies for Schools

**Table Structure**:

- `user_id` (UUID) - Record owner
- All other columns (name, location, etc.)

```sql
-- Enable RLS on schools table
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Read access for owner and linked users
CREATE POLICY "Users can read own and linked schools"
ON public.schools
FOR SELECT
USING (
  user_id IN (SELECT user_id FROM public.get_linked_user_ids())
);

-- Create new schools (owner only)
CREATE POLICY "Users can create own schools"
ON public.schools
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- Update own or linked schools
CREATE POLICY "Users can update own and linked schools"
ON public.schools
FOR UPDATE
USING (
  user_id IN (SELECT user_id FROM public.get_linked_user_ids())
)
WITH CHECK (
  user_id = auth.uid()  -- Prevent ownership changes
);

-- Delete own or linked schools
CREATE POLICY "Users can delete own and linked schools"
ON public.schools
FOR DELETE
USING (
  user_id IN (SELECT user_id FROM public.get_linked_user_ids())
);
```

---

## Step 3: Handle Coaches Table

⚠️ **ISSUE FOUND**: The coaches table doesn't have a `user_id` column. Coaches belong to schools via `school_id`, not directly to users.

### Option A: Add user_id Column (Recommended)

This provides direct ownership and is cleaner for RLS:

```sql
-- 1. Add user_id column
ALTER TABLE public.coaches
ADD COLUMN user_id UUID REFERENCES public.users(id);

-- 2. Populate from schools table (link coaches to their school's owner)
UPDATE public.coaches c
SET user_id = s.user_id
FROM public.schools s
WHERE s.id = c.school_id;

-- 3. Make NOT NULL
ALTER TABLE public.coaches
ALTER COLUMN user_id SET NOT NULL;

-- 4. Create index for performance
CREATE INDEX coaches_user_id_idx ON public.coaches(user_id);

-- 5. Enable RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- 6. Add policies
CREATE POLICY "Users can read own and linked coaches"
ON public.coaches
FOR SELECT
USING (
  user_id IN (SELECT user_id FROM public.get_linked_user_ids())
);

CREATE POLICY "Users can create own coaches"
ON public.coaches
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can update own and linked coaches"
ON public.coaches
FOR UPDATE
USING (
  user_id IN (SELECT user_id FROM public.get_linked_user_ids())
)
WITH CHECK (
  user_id = auth.uid()  -- Prevent ownership changes
);

CREATE POLICY "Users can delete own and linked coaches"
ON public.coaches
FOR DELETE
USING (
  user_id IN (SELECT user_id FROM public.get_linked_user_ids())
);
```

### Option B: Use Indirect RLS via school_id

If modifying the coaches schema is not possible:

```sql
-- Enable RLS on coaches table
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Read coaches from accessible schools
CREATE POLICY "Users can read coaches of accessible schools"
ON public.coaches
FOR SELECT
USING (
  school_id IN (
    SELECT id FROM public.schools
    WHERE user_id IN (SELECT user_id FROM public.get_linked_user_ids())
  )
);

-- Create coaches in owned schools only
CREATE POLICY "Users can create coaches in own schools"
ON public.coaches
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT id FROM public.schools
    WHERE user_id = auth.uid()
  )
);

-- Update coaches in accessible schools
CREATE POLICY "Users can update coaches in accessible schools"
ON public.coaches
FOR UPDATE
USING (
  school_id IN (
    SELECT id FROM public.schools
    WHERE user_id IN (SELECT user_id FROM public.get_linked_user_ids())
  )
)
WITH CHECK (
  school_id IN (
    SELECT id FROM public.schools
    WHERE user_id IN (SELECT user_id FROM public.get_linked_user_ids())
  )
);

-- Delete coaches from accessible schools
CREATE POLICY "Users can delete coaches from accessible schools"
ON public.coaches
FOR DELETE
USING (
  school_id IN (
    SELECT id FROM public.schools
    WHERE user_id IN (SELECT user_id FROM public.get_linked_user_ids())
  )
);
```

**Decision Needed**: Which approach should you use for coaches?

---

## ✅ Already Implemented: Interactions & Tasks

### Interactions Table - Read-Only (Migration 006)

**Policies Already Exist**:

- ✅ "Users can view interactions for own and linked schools" (SELECT)
- ✅ "Non-parents can insert interactions" (INSERT - parents blocked)
- ✅ "Non-parents can update interactions" (UPDATE - parents blocked)
- ✅ "Non-parents can delete interactions" (DELETE - parents blocked)

**Why This Works**:

- Interactions reference `school_id`
- Users can read interactions for schools they own or are linked to
- Parents are blocked from writing by role check (role != 'parent')
- ✅ **Secondary user access already satisfied** - parents can read, not write

---

### Athlete Tasks Table - Read-Only (Migration 005)

**Policies Already Exist**:

- ✅ "Users can view own and linked athlete tasks" (SELECT)
- ✅ "Athletes can create own task records" (INSERT - athletes only)
- ✅ "Athletes can update own task status" (UPDATE - athletes only)
- ✅ "Athletes can delete own task records" (DELETE - athletes only)

**Why This Works**:

- Tasks reference `athlete_id` directly
- Uses `get_linked_user_ids()` to allow parent viewing
- Role check ensures only athletes (not parents) can write
- ✅ **Secondary user access already satisfied** - parents can read, not write

---

## Implementation Steps

1. **Verify/Create `get_linked_user_ids()` function** (Step 1 SQL above)
2. **Create Schools RLS policies** (Step 2 SQL above)
3. **Choose Coaches approach** and apply appropriate SQL (Option A or B)
4. **Test Access**:

   ```sql
   -- Test as primary user (should see own schools)
   SELECT * FROM public.schools WHERE user_id = auth.uid();

   -- Test as linked secondary user (should also see primary's schools)
   SELECT * FROM public.schools;
   ```

---

## Verification

After applying policies, verify correct access:

```bash
# 1. Run type-check
npm run type-check

# 2. Run tests
npm run test -- useAccountLinks.spec.ts

# 3. Manual testing in app:
# - Primary user: Create school, invite secondary user, accept
# - Secondary user: Verify can read/edit that school
# - Secondary user: Verify cannot write to interactions/tasks
# - Primary user: Verify still has full access
```

---

## Troubleshooting

**Error: Column "user_id" does not exist**

- Likely on interactions table (uses `school_id`, not `user_id`)
- Use `school_id` reference instead, or check Schema Reference table above

**Error: Function "get_linked_user_ids" does not exist**

- Create the helper function from Step 1
- Verify it was created: `\df get_linked_user_ids`

**Secondary user cannot see primary's schools**

- Verify account link status is 'accepted'
- Check `get_linked_user_ids()` returns both users
- Verify schools RLS policies are enabled and created

**Secondary user can edit interactions (shouldn't be able to)**

- Verify migration 006 policies are applied
- Check that user's role is not 'student' (should block parents automatically)
- Run: `SELECT * FROM pg_policies WHERE tablename='interactions'`

---

## References

**Migrations with RLS**:

- `server/migrations/005_athlete_task_parent_restrictions.sql` - Tasks RLS
- `server/migrations/006_interactions_parent_restrictions.sql` - Interactions RLS

**Type Definitions**:

- `types/database.ts` - Table schemas and columns

**Current Implementation**:

- `composables/useAccountLinks.ts` - 5-user limit validation
- `server/api/account-links/invite.post.ts` - Email invitations
