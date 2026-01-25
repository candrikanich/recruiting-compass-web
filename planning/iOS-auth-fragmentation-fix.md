# iOS Authentication Implementation - Session Fragmentation Fix

**Date**: 2026-01-25
**For**: iOS App Development
**Related Web Fix**: Commit a6a6daf

---

## 🎯 Executive Summary

The web app had a critical bug where 31 different user_ids were created for a single Supabase auth account. **A database constraint was added to prevent this at the source**, which now affects the iOS app.

**Action Required for iOS**: Implement idempotent user profile creation to handle the new constraint gracefully.

---

## 🔴 The Problem (Background)

### What Happened (Web App)

- User authentication system called "create user profile" multiple times
- Each time it created a NEW user record instead of checking if one existed
- Result: 1 auth account fragmented into 31 different user records
- Cause: User initialization wasn't idempotent (calling it twice = bad state)

### Why It Matters for iOS

Same bug can happen in iOS if:

- Profile creation is called multiple times during app launch
- App is backgrounded/foregrounded (triggering re-initialization)
- User logs out and back in quickly
- Network issues cause retry logic to create duplicate profiles

---

## 🛡️ The Fix (Database Level)

### Migration 012: Added Constraint

```sql
ALTER TABLE public.users
ADD CONSTRAINT users_email_unique UNIQUE(email);

```

### What This Means for iOS

**Before**: Creating a profile with same email twice = 2 records (BAD)

```text
users table:
id                    | email              | role
------------------------+------------------+--------
user-id-1            | chris@example.com | student
user-id-2            | chris@example.com | student  ❌ DUPLICATE

```

**After**: Creating a profile with same email twice = Conflict error (GOOD)

```text
users table:
id                    | email              | role
------------------------+------------------+--------
user-id-1            | chris@example.com | student

Second insert attempt → HTTP 409 Conflict error

```

---

## 📋 iOS Implementation Requirements

### 1. Handle 409 Conflict Errors

When creating a user profile, expect `409 Conflict` responses:

```swift
// Before (fragile - would create duplicates)
func createUserProfile(email: String, fullName: String) async throws {
    let newUser = ["email": email, "full_name": fullName, "role": "student"]
    _ = try await supabase.from("users").insert(newUser).execute()
}

// After (robust - handles duplicates)
func createUserProfile(email: String, fullName: String) async throws {
    let newUser = ["email": email, "full_name": fullName, "role": "student"]

    do {
        _ = try await supabase.from("users").insert(newUser).execute()
        logger.debug("User profile created")
    } catch let error as PostgrestError {
        // 409 Conflict = profile already exists (expected and OK)
        if error.code == "23505" {  // Unique violation
            logger.debug("Profile already exists, treating as success")
            return
        }
        // Other errors should be thrown
        throw error
    }
}

```

### 2. Check Before Creating (Idempotent Pattern)

**Recommended**: Check if profile exists first before attempting creation

```swift
func ensureUserProfile(userId: String, email: String, fullName: String) async throws {
    // Step 1: Check if profile already exists
    do {
        let existing = try await supabase
            .from("users")
            .select("id")
            .eq("id", value: userId)
            .single()
            .execute()

        logger.debug("Profile already exists")
        return  // Profile exists, nothing to do
    } catch let error as PostgrestError {
        // PGRST116 = "not found", which is what we expect
        if error.code != "PGRST116" {
            throw error  // Unexpected error
        }
    }

    // Step 2: Profile doesn't exist, create it
    let newUser = ["id": userId, "email": email, "full_name": fullName, "role": "student"]
    do {
        _ = try await supabase.from("users").insert(newUser).execute()
        logger.debug("User profile created successfully")
    } catch let error as PostgrestError {
        // Handle duplicate key error
        if error.code == "23505" {
            logger.debug("Profile already exists (race condition), treating as success")
            return
        }
        throw error
    }
}

```

### 3. Centralize User Initialization

Create a single point where user state is initialized:

```swift
// AppDelegate or SceneDelegate
class AppDelegate: UIResponder, UIApplicationDelegate {
    let authManager = AuthenticationManager.shared

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Initialize user state ONCE at app startup
        Task {
            try await authManager.initializeUser()
        }
        return true
    }
}

```

### 4. Don't Re-initialize Unnecessarily

**❌ DON'T do this** (causes fragmentation):

```swift
// In every view that appears
override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    // ❌ BAD: This calls user init every time view appears
    Task {
        try await authManager.initializeUser()
    }
}

```

**✅ DO this** (centralized):

```swift
// Initialize ONCE in AppDelegate
// Views use the already-initialized state from authManager
override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    // Just refresh UI from existing state
    let currentUser = authManager.currentUser
    updateUI(with: currentUser)
}

```

---

## 🧪 Testing Checklist

### Unit Tests

1. **Idempotence Test**: Calling profile creation twice returns success both times

```swift
func testCreateUserProfileIsIdempotent() async throws {
    let userId = UUID().uuidString
    let email = "test@example.com"

    // First call
    try await manager.createUserProfile(id: userId, email: email, name: "Test")

    // Second call should NOT throw, should return success
    try await manager.createUserProfile(id: userId, email: email, name: "Test")

    // Verify only ONE profile exists
    let profiles = try await supabase
        .from("users")
        .select()
        .eq("email", value: email)
        .execute()

    XCTAssertEqual(profiles.count, 1)
}

```

2. **Conflict Handling Test**: 409 Conflict handled gracefully

```swift
func testHandles409ConflictGracefully() async throws {
    let userId = UUID().uuidString
    let email = "test@example.com"

    // Create first profile
    try await manager.createUserProfile(id: userId, email: email, name: "Test")

    // Try to create duplicate - should NOT throw error
    let result = try await manager.createUserProfile(id: userId, email: email, name: "Test")

    XCTAssertTrue(result)  // Should indicate success
}

```

### Manual Testing on Device

1. **Fresh Install**
   - Install app
   - Sign up / log in
   - Verify user profile created with correct email
   - Check Supabase dashboard: only 1 user record

2. **Force Re-initialization**
   - Log in
   - Hard kill app (swipe up)
   - Reopen app
   - Verify same user_id (check in app state or Supabase)
   - No duplicate profiles created

3. **Logout/Login**
   - Log out
   - Log back in with same credentials
   - Verify same user_id and email
   - No duplicate profiles

4. **Background/Foreground**
   - App in foreground
   - Press home button (background app)
   - Reopen app
   - Verify same user_id
   - No duplicate profiles

---

## 📱 Implementation Timeline

### Phase 1: Handle Conflicts (Week 1)
- [ ] Add 409 Conflict error handling to profile creation
- [ ] Add logging for conflict detection
- [ ] Test on staging

### Phase 2: Idempotent Pattern (Week 2)
- [ ] Implement check-before-create pattern
- [ ] Add unit tests for idempotence
- [ ] Remove any redundant profile creation calls

### Phase 3: Centralize Init (Week 2-3)
- [ ] Move user initialization to AppDelegate/SceneDelegate
- [ ] Remove initialization from view controllers
- [ ] Verify single initialization point in logs

### Phase 4: Testing & Validation (Week 3)
- [ ] Run full manual test suite
- [ ] Monitor Supabase for duplicate emails in production
- [ ] Set up alerts for 409 errors

---

## 🔍 Monitoring & Debugging

### Logs to Add

In authentication manager:

```swift
// User initialization
logger.debug("[AuthManager] Starting user initialization")
logger.debug("[AuthManager] User authenticated: \(email)")
logger.debug("[AuthManager] User profile already exists")
logger.debug("[AuthManager] Creating new user profile")
logger.debug("[AuthManager] User initialization complete")
logger.error("[AuthManager] Failed to initialize user: \(error)")

// Profile creation
logger.debug("[AuthManager] Creating profile for: \(email)")
logger.debug("[AuthManager] Profile already exists, skipping")
logger.debug("[AuthManager] Profile created successfully")
logger.debug("[AuthManager] Conflict error (409), treating as success")
logger.error("[AuthManager] Failed to create profile: \(error)")

```

### Debug Query (Supabase Dashboard)

Check for duplicate emails:

```sql
SELECT email, COUNT(*) as count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

```

Expected result: Empty (no duplicates)

---

## ⚠️ Error Codes Reference

| Error Code | Meaning | Handling |
|-----------|---------|----------|
| **23505** | Unique constraint violation (duplicate email) | Treat as success (profile already exists) |
| **PGRST116** | No rows found | Expected when checking if profile exists |
| **400** | Bad request | Validation error, propagate to user |
| **401** | Unauthorized | Auth failed, redirect to login |
| **500** | Server error | Retry with exponential backoff |

---

## 📚 Reference Implementation

The web app implementation that fixed this issue:

- **File**: `stores/user.ts` → `createUserProfile()` method
- **Pattern**: Check exists → Handle conflict → Return boolean success/failure
- **Logging**: All logs prefixed with `[ClassName]` for filtering
- **Testing**: Unit tests for idempotence and duplicate detection

See commit `a6a6daf` in web repo for full context.

---

## 🚀 Deployment Checklist

Before pushing to production:

- [ ] All 409 Conflict errors handled gracefully
- [ ] User profile creation is idempotent
- [ ] Single initialization point implemented
- [ ] All redundant initialization calls removed
- [ ] Unit tests passing (idempotence, conflict handling)
- [ ] Manual testing completed (all 4 scenarios)
- [ ] Logging in place for debugging
- [ ] No TypeScript/Swift compilation errors
- [ ] Code review completed

---

## 📞 Questions?

If you find issues or edge cases:

1. **Duplicate emails still appearing?** → Check that all `insert` calls handle 409 errors
2. **Profile creation sometimes fails?** → Add retry logic with exponential backoff
3. **User_id changing unexpectedly?** → Verify single initialization point, check logs for `[AuthManager]` errors
4. **Users seeing "profile not found" errors?** → Profile might not exist; implement fallback to create it

---

## Summary

The database constraint now enforces one profile per email. iOS must:

1. ✅ Handle 409 Conflict errors (email already exists)
2. ✅ Check before creating (idempotent)
3. ✅ Initialize user once at startup
4. ✅ Avoid redundant initialization calls
5. ✅ Test for fragmentation regression

**Result**: iOS users will never experience the 31-user_id fragmentation bug that affected the web app.
