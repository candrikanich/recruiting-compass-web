# Mock Setup Fix - Action Plan

## Critical Issue Summary

**Problem**: `useAuth-rememberMe.spec.ts` declares a mock variable without initializing it before `vi.mock()`, causing it to return `undefined`. This breaks the test and affects other tests through module cache pollution.

**Impact**: 30+ test failures across multiple files

**Fix Difficulty**: Low (straightforward pattern replacement)

---

## Step-by-Step Fix

### Step 1: Fix useAuth-rememberMe.spec.ts

#### Current Code (Broken - Lines 1-72)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";  // ❌ Import but don't use
import type { User, Session } from "@supabase/supabase-js";
import type { SessionPreferences } from "~/types/session";

let mockSupabaseGlobal: any;  // ❌ UNINITIALIZED VARIABLE

vi.mock("~/composables/useSupabase", () => ({  // ❌ References undefined variable
  useSupabase: () => mockSupabaseGlobal,
}));

describe("useAuth - Remember Me Functionality", () => {
  // ... test constants ...

  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create fresh mock objects for each test
    mockAuth = {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      }),
      // ... more mocks ...
    };

    mockSupabaseGlobal = {  // ❌ Initialization happens here (too late!)
      auth: mockAuth,
    };
  });
```

#### Fixed Code

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuth } from "~/composables/useAuth";
import { mockSupabase } from "~/tests/setup";  // ✅ IMPORT FROM SETUP
import type { User, Session } from "@supabase/supabase-js";
import type { SessionPreferences } from "~/types/session";

// ✅ REMOVED: let mockSupabaseGlobal: any;
// ✅ REMOVED: vi.mock() definition - let setup.ts handle it

describe("useAuth - Remember Me Functionality", () => {
  // ... test constants ...

  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();  // ✅ Global afterEach in setup.ts also does this
    localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create fresh mock objects for each test
    mockAuth = {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      }),
      // ... more mocks ...
    };

    // ✅ CONFIGURE the imported mockSupabase instead of local variable
    mockSupabase.auth = mockAuth;  // OR use mockSupabase.auth.getSession.mockResolvedValue(...)
    mockSupabase.from = vi.fn();   // if needed

    // Alternative: Configure individual methods
    // mockSupabase.auth.getSession = mockAuth.getSession;
    // mockSupabase.auth.signInWithPassword = mockAuth.signInWithPassword;
    // etc.
  });
```

**Changes Required**:

1. Delete lines 7-11 (the `let mockSupabaseGlobal: any;` and `vi.mock()` definition)
2. Replace line 3 import: `import { useSupabase } from "~/composables/useSupabase";` → `import { mockSupabase } from "~/tests/setup";`
3. Line 69: Change `mockSupabaseGlobal = { auth: mockAuth };` → `mockSupabase.auth = mockAuth;`

---

### Step 2: Verify No Other Files Have Same Pattern

#### Scan for Uninitialized Mock Variables

```bash
# Check for pattern: "let mockSomething: any;" followed by "vi.mock()"
for file in tests/unit/composables/*.spec.ts; do
  if grep -q "^let mock.*: any;$" "$file" && grep -q "^vi\.mock" "$file"; then
    echo "⚠️  POTENTIAL ISSUE: $(basename $file)"
    head -15 "$file"
  fi
done
```

**Expected Output**: Mostly clean files (they initialize mocks before vi.mock)

#### Check All Files with vi.mock()

```bash
# List all files with local vi.mock definitions
grep -l "^vi\.mock.*useSupabase" tests/unit/composables/*.spec.ts
```

**Expected**: 24 files (review each)

---

### Step 3: Test the Fix

#### Test Single File

```bash
npm run test -- tests/unit/composables/useAuth-rememberMe.spec.ts
```

**Expected Output**: All tests pass (6 tests for Remember Me functionality)

#### Test Related Composables

```bash
npm run test -- tests/unit/composables/useAuth.spec.ts
npm run test -- tests/unit/composables/useInteractions.spec.ts
npm run test -- tests/unit/composables/useInteractions-athlete.spec.ts
```

**Expected Output**: All tests pass

#### Run Full Test Suite

```bash
npm run test
```

**Expected Output**: All tests pass (should see significant improvement from current state)

---

## Verification Checklist

- [ ] Line 3 of useAuth-rememberMe.spec.ts imports from setup.ts ✅
- [ ] Lines 7-11 (mock declaration and vi.mock) are deleted ✅
- [ ] Line 69 sets mockSupabase.auth instead of mockSupabaseGlobal ✅
- [ ] Single test file passes: `npm run test -- useAuth-rememberMe.spec.ts` ✅
- [ ] Related tests pass: `npm run test -- tests/unit/composables/useAuth*` ✅
- [ ] Full suite passes: `npm run test` ✅
- [ ] No "Cannot destructure" errors ✅
- [ ] Mock assertions like `toHaveBeenCalledTimes(1)` pass ✅

---

## Related Issues to Audit

### Secondary Issue: Module Cache Pollution

Even after fixing useAuth-rememberMe.spec.ts, review if other files need fixes:

1. **useDocumentsConsolidated.spec.ts** - Also has vi.mock() for useSupabase
   - Check if mockSupabase is properly initialized

2. **All 24 test files with vi.mock(useSupabase)** - May have similar issues
   - Recommendation: Gradually migrate all to use setup.ts mock
   - Low priority since most seem to initialize correctly

### Low Priority Improvements

1. Add ESLint rule to detect `vi.mock()` outside setup.ts
2. Update CLAUDE.md with mock setup guidelines
3. Consider consolidating all test mocks into setup.ts

---

## Expected Improvements

### Before Fix

```
FAIL tests/unit/composables/useAuth-rememberMe.spec.ts [x]
  useAuth - Remember Me Functionality
    ✓ Initial State (1 test)
    ✗ Login with Remember Me (4 tests)
      TypeError: Cannot destructure property 'data'...
    ✗ Logout Clears Session Preferences (2 tests)
      TypeError: Cannot destructure property 'error'...

FAIL tests/unit/composables/useAuth.spec.ts [x]
  useAuth
    ✓ Initial State
    ✗ restoreSession
      AssertionError: expected mock to have been called 1 times, but got 0 times

Test Files: 10 failed, 13 passed
Tests: 30+ failed, remaining passed
```

### After Fix

```
PASS tests/unit/composables/useAuth-rememberMe.spec.ts ✓
  useAuth - Remember Me Functionality
    ✓ Initial State (1 test)
    ✓ Login with Remember Me (4 tests)
    ✓ Logout Clears Session Preferences (2 tests)

PASS tests/unit/composables/useAuth.spec.ts ✓
  useAuth
    ✓ Initial State
    ✓ restoreSession
    ✓ login
    ✓ logout
    ✓ signup
    ✓ setupAuthListener
    ...

Test Files: all passed ✓
Tests: all passed ✓
```

---

## Rollback Plan (if needed)

If the fix causes issues, revert with:

```bash
git checkout -- tests/unit/composables/useAuth-rememberMe.spec.ts
```

This is a low-risk change since we're:

1. Using the exact same mock object (from setup.ts)
2. Configuring it the same way (in beforeEach)
3. Just changing where it's imported from and when it's initialized

---

## Implementation Notes

### Why This Works

1. **setup.ts mocks useSupabase globally** - All tests share it
2. **mockSupabase is properly initialized** - Has all required methods
3. **beforeEach configures it per test** - Each test gets what it needs
4. **afterEach clears all mocks** - No cross-test pollution

### Why the Current Code Fails

1. **Uninitialized variable in closure** - Captured as undefined
2. **Vitest module hoisting** - vi.mock() evaluated before let assignment
3. **Composable receives undefined** - Crashes on first method call
4. **Mock never invoked** - Assertion counts are 0

### Key Pattern

✅ **GOOD**: Centralized mock in setup.ts, imported by tests, configured in beforeEach
❌ **BAD**: File-local mock with hoisting issues and late initialization

---

## Next Steps

1. Apply the fix to useAuth-rememberMe.spec.ts
2. Run tests to verify
3. Document mock setup pattern in CLAUDE.md
4. Optional: Audit other test files for similar issues
5. Optional: Add ESLint rule to prevent future issues
