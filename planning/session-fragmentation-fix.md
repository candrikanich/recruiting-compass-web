# Session Fragmentation Fix Plan

**Issue**: 31 different user_ids were created in the database for a single user account (chris@andrikanich.com)

**Root Cause**:
- `initializeUser()` called multiple times without proper guards
- Profile creation fails silently, leaving user without profile
- Repeated calls attempt to create profile again, potentially with different context
- No unique constraint to prevent duplicate user records

---

## Phase 1: Add Safety Guards & Constraints

### 1.1 Add Unique Constraint on Users Table
**File**: Create new migration `012_add_users_table_constraints.sql`

**Purpose**: Prevent duplicate user records even if profile creation is called multiple times

```sql
-- Ensure email is unique (only one user per email)
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE(email);

-- Log the change
COMMENT ON CONSTRAINT users_email_unique ON users IS
  'Prevents duplicate user records for same email address';
```

**Why**: If somehow `createUserProfile()` is called twice with the same email, the constraint will prevent duplicates and give us a clear error to handle.

---

### 1.2 Add Idempotence Guard to `useAuth` Composable
**File**: `composables/useAuth.ts`

**Current Issue**: `restoreSession()` has an `isInitialized` guard, but it returns null if already initialized, which could be confusing

**Fix**: Make the guard clearer and add logging

```typescript
// Add explicit initialization state tracking
const initializationAttempt = ref(false);

const restoreSession = async () => {
  if (isInitialized.value) {
    console.log("[useAuth] Session already initialized, skipping");
    return session.value; // Return current session instead of null
  }

  if (initializationAttempt.value) {
    console.log("[useAuth] Session initialization in progress, waiting...");
    // Wait for initialization to complete
    while (initializationAttempt.value && !isInitialized.value) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return session.value;
  }

  initializationAttempt.value = true;
  try {
    // ... existing logic
  } finally {
    initializationAttempt.value = false;
  }
};
```

---

## Phase 2: Fix Profile Creation Logic

### 2.1 Refactor `initializeUser()` with Better Error Handling
**File**: `stores/user.ts`, lines 28-93

**Changes**:

1. **Add explicit flag** to track if profile creation was attempted
2. **Use UPSERT pattern** instead of separate fetch + create
3. **Add proper error context** so we know why profile creation failed

```typescript
async initializeUser() {
  const supabase = useSupabase();
  this.loading = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // Set user from auth session
      this.user = {
        id: session.user.id,
        email: session.user.email || "",
        full_name: session.user.user_metadata?.full_name || "",
        role: "student",
      };
      this.isAuthenticated = true;
      this.isEmailVerified =
        session.user.email_confirmed_at !== null &&
        session.user.email_confirmed_at !== undefined;

      // Try to fetch profile
      const { data: profile, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = "not found", which is ok
        // Other errors = problem we need to address
        console.error("[initializeUser] Unexpected fetch error:", fetchError);
      }

      if (profile) {
        // Profile exists, use it
        this.user = profile;
      } else {
        // Profile doesn't exist, try to create it
        const created = await this.createUserProfile(
          session.user.id,
          session.user.email || "",
          session.user.user_metadata?.full_name || "",
        );

        if (!created) {
          // Creation failed but don't block - user is still authenticated
          console.warn(
            "[initializeUser] Failed to create profile for user:",
            session.user.id,
          );
        }
      }
    } else {
      this.user = null;
      this.isAuthenticated = false;
    }
  } catch (error) {
    console.error("[initializeUser] Unexpected error:", error);
    this.user = null;
    this.isAuthenticated = false;
  } finally {
    this.loading = false;
  }
}
```

### 2.2 Improve `createUserProfile()` with Better Error Handling
**File**: `stores/user.ts`, lines 95-129

**Changes**:

1. **Check if profile already exists** before attempting insert
2. **Return boolean** to indicate success/failure
3. **Log specific errors** for debugging
4. **Handle constraint violations gracefully**

```typescript
async createUserProfile(
  userId: string,
  email: string,
  fullName: string,
): Promise<boolean> {
  const supabase = useSupabase();

  try {
    console.log("[createUserProfile] Creating profile for:", email);

    // Check if profile already exists
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (existing) {
      console.log("[createUserProfile] Profile already exists, skipping");
      return true; // Already exists, treat as success
    }

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = not found (expected), other errors are problems
      throw new Error(
        `[createUserProfile] Check failed: ${checkError.message}`,
      );
    }

    // Profile doesn't exist, create it
    const { error: insertError, data } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          email,
          full_name: fullName || email.split("@")[0],
          role: "student",
        },
      ])
      .select();

    if (insertError) {
      // Check if it's a duplicate key error
      if (insertError.code === "23505") {
        console.log("[createUserProfile] Profile exists (duplicate key), skipping");
        return true; // It exists, treat as success
      }
      throw insertError;
    }

    console.log("[createUserProfile] Profile created successfully");
    this.user = {
      id: userId,
      email,
      full_name: fullName || email.split("@")[0],
      role: "student",
    };

    return true;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error("[createUserProfile] Failed:", message);
    return false; // Indicate failure
  }
}
```

---

## Phase 3: Add Initialization Guards

### 3.1 Single Point of Initialization in App Root
**File**: `app.vue` (or create if doesn't exist)

**Purpose**: Initialize user store ONCE at app startup, not on every route change

```vue
<script setup lang="ts">
import { onBeforeMount } from "vue";
import { useUserStore } from "~/stores/user";

const userStore = useUserStore();
let initializePromise: Promise<void> | null = null;

// Initialize user once at app startup
onBeforeMount(async () => {
  if (!initializePromise) {
    initializePromise = (async () => {
      try {
        await userStore.initializeUser();
      } catch (err) {
        console.error("[App] Failed to initialize user:", err);
      }
    })();
  }

  await initializePromise;
});
</script>
```

### 3.2 Remove Duplicate Initialization from Middleware
**File**: `middleware/auth.ts`

**Change**: Remove the `initializeUser()` call since it's now done in app.vue

```typescript
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const userStore = useUserStore();

  // User is already initialized from app.vue
  // Just check session timeout on client side
  if (process.client) {
    // ... session timeout check logic
  }
});
```

### 3.3 Remove Duplicate Initialization from Page Components
**Files to update**:
- `pages/login.vue` - Remove `await userStore.initializeUser()` after successful login
- `pages/signup.vue` - Remove `await userStore.initializeUser()` after successful signup
- `pages/verify-email.vue` - Remove `await userStore.initializeUser()` on mount

**New pattern**: After login/signup, the Supabase session is automatically updated, and the app.vue initialization will pick it up.

---

## Phase 4: Add Monitoring & Diagnostics

### 4.1 Add Debug Logging Hook
**File**: Create new `composables/useAuthDebug.ts`

```typescript
export const useAuthDebug = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const logAuthState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    console.group("[Auth Debug]");
    console.log("Auth User ID:", user?.id);
    console.log("Auth Email:", user?.email);
    console.log("Session User ID:", session?.user?.id);
    console.log("Session Email:", session?.user?.email);
    console.log("Store User ID:", userStore.user?.id);
    console.log("Store Email:", userStore.user?.email);
    console.log("Store Authenticated:", userStore.isAuthenticated);
    console.groupEnd();
  };

  return { logAuthState };
};
```

---

## Phase 5: Database Cleanup

### 5.1 Audit Existing Users Table
**Purpose**: Identify and clean up duplicate/orphaned user records

```sql
-- Check for duplicate emails in users table
SELECT email, COUNT(*) as count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for orphaned user records (no associated schools)
SELECT u.id, u.email, COUNT(s.id) as school_count
FROM public.users u
LEFT JOIN public.schools s ON s.user_id = u.id
WHERE u.email != 'chris@andrikanich.com'
GROUP BY u.id, u.email
HAVING COUNT(s.id) = 0
ORDER BY u.created_at DESC;
```

### 5.2 Document User ID Stability
**Purpose**: Verify that session.user.id is actually stable from Supabase auth

Create a test to confirm:
```typescript
// In browser console during testing
const supabase = useSupabase();
const { data: { user: user1 } } = await supabase.auth.getUser();
console.log("User 1:", user1.id);

// Refresh page
// Then check again
const { data: { user: user2 } } = await supabase.auth.getUser();
console.log("User 2:", user2.id);

// Should be identical
```

---

## Implementation Order

1. **Phase 1.1**: Add unique constraint on users.email
2. **Phase 2.1 & 2.2**: Refactor profile creation logic (safest changes)
3. **Phase 4.1**: Add debug logging (for verification)
4. **Phase 3.1 & 3.2 & 3.3**: Centralize initialization (requires UI testing)
5. **Phase 1.2**: Add initialization attempt guard (optional enhancement)
6. **Phase 5**: Database audit and cleanup

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Sign up new account → verify one user profile created
- [ ] Log out, log back in → verify same user_id throughout
- [ ] Hard refresh page → verify user_id stable
- [ ] Change password → verify user_id stable
- [ ] Multiple tabs open → verify same user_id in all tabs
- [ ] Browser dev tools → run `useAuthDebug().logAuthState()` → verify consistency

### Automated Testing
- Add unit test for `initializeUser()` idempotency
- Add integration test for profile creation deduplication
- Add E2E test for login/logout/login flow

---

## Risk Assessment

**Low Risk**:
- Adding unique constraint (prevents bugs, no data loss)
- Refactoring profile creation logic (improved error handling)
- Adding debug logging

**Medium Risk**:
- Removing initialization from middleware/pages (timing issues possible)
- Centralizing initialization in app.vue (needs testing)

**Mitigation**:
- Test thoroughly before deploying
- Add fallback initialization in critical routes
- Monitor for initialization failures in production

---

## Success Criteria

✅ No more than 1 user_id per email in database
✅ User can log in/out/back in without creating new user profiles
✅ Password reset doesn't create new user_id
✅ Hard refresh doesn't create new user_id
✅ Console logs show consistent user_id throughout session

