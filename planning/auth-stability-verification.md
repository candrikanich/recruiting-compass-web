# Authentication Stability Verification & Database Audit

## Purpose

Document the fix for session fragmentation issue and provide tools to verify user_id stability going forward.

---

## Background: What Was Fixed

**Problem**: 31 different user_ids were created in the database for a single Supabase auth account (chris@andrikanich.com)

**Root Cause**:

- `initializeUser()` called multiple times from different components (middleware, pages, etc.)
- Profile creation not idempotent - errors were swallowed silently
- No unique constraints to prevent duplicates

**Solution Implemented**:

1. **Migration 012**: Added UNIQUE constraint on `users.email`
2. **Enhanced profile creation**: Added idempotence checks and better error handling
3. **Centralized initialization**: Single point of initialization in app.vue
4. **Removed redundant calls**: Deleted from middleware and page components
5. **Added debug tools**: Created `useAuthDebug` composable for monitoring

---

## Database Audit Queries

Run these in Supabase SQL editor to verify the fix:

### 1. Check for duplicate emails in users table

```sql
SELECT email, COUNT(*) as count, STRING_AGG(id::text, ', ') as user_ids
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

**Expected Result**: Empty (no duplicates)

### 2. Check schools ownership distribution

```sql
SELECT user_id, COUNT(*) as school_count
FROM public.schools
GROUP BY user_id
ORDER BY school_count DESC;
```

**Expected Result**: Most schools owned by chris@andrikanich.com's user_id

### 3. Check for orphaned user profiles

```sql
SELECT u.id, u.email, COUNT(s.id) as school_count
FROM public.users u
LEFT JOIN public.schools s ON s.user_id = u.id
GROUP BY u.id, u.email
HAVING COUNT(s.id) = 0
ORDER BY u.created_at DESC
LIMIT 10;
```

**Expected Result**: Few or no orphaned profiles

### 4. Verify unique constraint is in place

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
ORDER BY constraint_name;
```

**Expected Result**: Should include `users_email_unique`

---

## User ID Stability Test

Use the debug composable to verify user_id never changes:

### From Browser Console:

```javascript
// Import the composable
const { verifyUserIdStability, logAuthState } = useAuthDebug();

// Run comprehensive stability test (takes ~200ms)
const result = await verifyUserIdStability();

// Or check current state anytime
await logAuthState();
```

### Test Scenarios

Run these tests to ensure stability:

1. **Initial Load**
   - Open browser
   - Run `verifyUserIdStability()`
   - Should show: ✅ User IDs are STABLE

2. **Hard Refresh**
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Wait for page to load
   - Run `logAuthState()`
   - User ID should be same as before refresh

3. **Login/Logout/Login**
   - Log out: `/login` → click logout
   - Log back in with same credentials
   - Run `logAuthState()`
   - Should show single user_id (not fragmented)

4. **Password Change**
   - Go to account settings
   - Change password
   - Run `logAuthState()`
   - User ID should NOT change

5. **Multiple Tabs**
   - Open app in Tab A
   - Open same app in Tab B
   - Run `logAuthState()` in both tabs
   - Both should show same user_id

### Debugging If Issues Found

If `logAuthState()` shows inconsistencies:

1. Open browser console
2. Run: `const state = await useAuthDebug().getAuthState(); console.table(state);`
3. Check for any field mismatches
4. If auth user ID doesn't match store, user initialization failed
5. Check browser console for "[App]" or "[initializeUser]" error messages

---

## Monitoring & Prevention

### Log Statements Added

The following debug logs are now in place:

**In `app.vue`**:

- `[App] Starting user initialization`
- `[App] User initialization complete`
- `[App] Failed to initialize user: [error]`

**In `stores/user.ts` - initializeUser()**:

- `[initializeUser] User authenticated: [email]`
- `[initializeUser] Existing profile loaded`
- `[initializeUser] No profile found, attempting creation`
- `[initializeUser] Failed to create profile for user: [user_id]`
- `[initializeUser] No active session`
- `[initializeUser] Unexpected error: [error]`

**In `stores/user.ts` - createUserProfile()**:

- `[createUserProfile] Attempting to create profile for: [email]`
- `[createUserProfile] Profile already exists, skipping`
- `[createUserProfile] Check failed: [error]`
- `[createUserProfile] Profile created successfully`
- `[createUserProfile] Profile exists (duplicate key), treating as success`
- `[createUserProfile] Failed: [error]`

**In `composables/useAuth.ts` - restoreSession()**:

- `[useAuth] Session already initialized, returning cached session`
- `[useAuth] Session initialization in progress, waiting...`
- `[useAuth] Session restored successfully for user: [email]`
- `[useAuth] No active session found`
- `[useAuth] Session restoration failed: [error]`

### Console Output Format

All debug logs use `[ClassName]` prefix for easy filtering in browser console:

- Filter for auth issues: `"[initializeUser]"` or `"[createUserProfile]"` or `"[useAuth]"`
- Filter for app initialization: `"[App]"`
- Filter all: `"["`

---

## Regression Prevention

### Code Changes Made

1. **Migration 012** - Database constraint
2. **Enhanced `initializeUser()`** - Better error handling, idempotence checks
3. **Enhanced `createUserProfile()`** - Idempotence, duplicate detection, return boolean
4. **Updated `useAuth.restoreSession()`** - Concurrent call prevention, better state management
5. **Updated `app.vue`** - Single point of initialization
6. **Updated `middleware/auth.ts`** - Removed redundant initialization
7. **Updated `pages/login.vue`** - Removed redundant initialization
8. **Updated `pages/signup.vue`** - Removed redundant initialization
9. **Updated `pages/verify-email.vue`** - Removed redundant initialization
10. **Created `useAuthDebug.ts`** - Debug tooling

### Tests to Add

Future developers should add these tests to prevent regression:

1. **Unit Test**: Profile creation idempotence

   ```typescript
   it("should not create duplicate profiles when called multiple times", async () => {
     await store.createUserProfile(userId, email, fullName);
     const result = await store.createUserProfile(userId, email, fullName);
     expect(result).toBe(true); // Should return success, not fail
   });
   ```

2. **Unit Test**: Single user_id per auth account

   ```typescript
   it("should maintain same user_id across multiple initializations", async () => {
     const id1 = (await store.initializeUser()).user?.id;
     const id2 = (await store.initializeUser()).user?.id;
     expect(id1).toBe(id2);
   });
   ```

3. **E2E Test**: User_id stability through login flow

   ```typescript
   it("should not fragment user_id through login/logout/login", async () => {
     // Login, get user_id
     // Logout
     // Login again
     // Verify same user_id
   });
   ```

4. **E2E Test**: User_id stability through password change
   ```typescript
   it("should not fragment user_id when password is changed", async () => {
     // Get initial user_id
     // Change password
     // Verify same user_id
   });
   ```

---

## Deployment Checklist

Before deploying this fix to production:

- [ ] All 5 phases implemented (constraints, profile creation, centralization, debug logging, audit)
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] All existing tests pass: `npm run test`
- [ ] Local testing passed:
  - [ ] Hard refresh shows same user_id
  - [ ] Login/logout/login shows same user_id
  - [ ] Multiple tabs show same user_id
  - [ ] `logAuthState()` shows ✅ CONSISTENT
- [ ] Migration 012 applied to Supabase
- [ ] Database audit queries run successfully
- [ ] No duplicate emails found in users table

---

## Post-Deployment Verification

After deploying to production:

1. **Day 1**: Monitor browser console logs for auth errors
   - Search for `"Failed"` in `[App]`, `[initializeUser]`, `[createUserProfile]` logs
   - No errors expected

2. **Week 1**: Run audit queries in production

   ```sql
   -- Check for duplicates
   SELECT COUNT(*) FROM (
     SELECT email, COUNT(*) as count
     FROM public.users
     GROUP BY email
     HAVING COUNT(*) > 1
   ) t;
   -- Should return 0
   ```

3. **Ongoing**: Set up alerts for auth-related errors
   - Monitor Supabase logs for RLS violations
   - Monitor app logs for `[initializeUser]` or `[createUserProfile]` failures

---

## Future Enhancements

Consider adding:

1. **Session persistence** - Save/restore session across page reloads
2. **Auth state machine** - Track state transitions for better debugging
3. **Automatic retry** - Retry failed profile creation with exponential backoff
4. **Analytics** - Track how often profiles are created vs. already exist
5. **User cohort analysis** - Identify which users might have had fragmented accounts

---

## References

- `migration/012_add_users_table_constraints.sql` - Unique constraint
- `stores/user.ts` - User store with enhanced initialization
- `composables/useAuth.ts` - Auth session management
- `composables/useAuthDebug.ts` - Debug tooling
- `app.vue` - Single point of initialization
- `planning/session-fragmentation-fix.md` - Full implementation plan
