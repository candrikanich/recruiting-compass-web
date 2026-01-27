# Mock Setup Investigation Report

## Executive Summary

**Root Cause**: Test files redefine `vi.mock("~/composables/useSupabase")` locally, overriding the global mock from `tests/setup.ts`. The specific failure occurs when a test file declares the mock variable **without initializing it** before the `vi.mock()` call, resulting in undefined references that cause destructuring failures.

**Affected Files**: 24 test files contain local `vi.mock("~/composables/useSupabase")` definitions.

**Critical Issue**: `useAuth-rememberMe.spec.ts` uniquely declares `let mockSupabaseGlobal: any;` on line 7, then immediately calls `vi.mock()` on line 9 that references this uninitialized variable. The initialization only happens in `beforeEach()` (line 69), **after module loading is complete**.

---

## Problem Analysis

### Module Load Sequence (Problematic)

```
1. Test file is parsed
2. ❌ Line 7: let mockSupabaseGlobal: any;  (declared but undefined)
3. ❌ Line 9: vi.mock() is hoisted - references undefined mockSupabaseGlobal
4. Module cache creates mock returning: () => undefined
5. useAuth is imported, gets useSupabase bound to undefined mock
6. Test starts, beforeEach() runs
7. Line 69: mockSupabaseGlobal = {...}  (too late!)
8. Test calls useAuth() → useSupabase() → undefined
9. supabase.auth.getSession() → Cannot destructure undefined
10. ❌ TEST FAILS: "Cannot destructure property 'data' of '(intermediate value)' as it is undefined"
```

### Module Load Sequence (Correct - Other Files)

Files like `useInteractions.spec.ts` do it correctly:

```typescript
const mockSupabase = {  // ✅ INITIALIZED
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,  // ✅ References initialized object
}));
```

This works because `mockSupabase` exists before `vi.mock()` hoists.

---

## Detailed Failure Scenarios

### Scenario 1: useAuth-rememberMe.spec.ts (Primary Culprit)

**File**: `/tests/unit/composables/useAuth-rememberMe.spec.ts`

**Lines 7-11**:
```typescript
let mockSupabaseGlobal: any;  // ❌ Uninitialized

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,  // ❌ Returns undefined
}));
```

**Lines 69-71 (too late)**:
```typescript
mockSupabaseGlobal = {
  auth: mockAuth,
};
```

**Failure Chain**:
1. Test calls `useAuth().login(...)`
2. `login()` calls `const supabase = useSupabase()`
3. `supabase` is `undefined`
4. `await supabase.auth.signInWithPassword({...})`
5. **TypeError**: Cannot destructure property 'data' of '(intermediate value)' as it is undefined

**Failing Tests** (6 tests in this file):
- `should store session preferences with 30-day expiry when rememberMe is true`
- `should store session preferences with 1-day expiry when rememberMe is false`
- `should default to rememberMe false when not provided`
- `should update lastActivity timestamp on login`
- `should remove session_preferences from localStorage on logout`
- `should clear last_activity from localStorage on logout`

---

### Scenario 2: useAuth.spec.ts (Mock Call Not Invoked)

**File**: `/tests/unit/composables/useAuth.spec.ts`

**Issue**: Mock is defined globally in `setup.ts`, but when running full test suite, `useAuth-rememberMe.spec.ts` loads first (alphabetically), corrupting the module cache.

**Test Line 97**:
```typescript
expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
// ❌ AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
```

**Why Mock Isn't Called**:
- `useAuth.spec.ts` imports `mockSupabase` from setup.ts (correct)
- But by then, another test file's bad mock has poisoned the module cache
- Or the composable never executes far enough to call the mock (due to earlier error)

---

### Scenario 3: useInteractions.spec.ts (Mock Calls Don't Happen)

**File**: `/tests/unit/composables/useInteractions.spec.ts`

**Line 114**:
```typescript
expect(query.eq).toHaveBeenCalledWith('logged_by', 'athlete-123');
// ❌ AssertionError: expected "vi.fn()" to be called with arguments: [ 'logged_by', 'athlete-123' ]
// Number of calls: 0
```

**Root Cause**:
- Same module cache poisoning from earlier test files
- Query chain never completes because composable errors on useSupabase call
- Mock functions never get invoked

---

## Evidence: File-by-File Analysis

### Files with Problematic Mock Setup

**24 test files** contain `vi.mock("~/composables/useSupabase", ...)`:

```
✅ Correct (initialized before vi.mock):
- useInteractions.spec.ts: const mockSupabase = {...}; vi.mock(...)
- useInteractions.extended.spec.ts: const mockSupabase = {...}; vi.mock(...)
- useSchools.spec.ts: const mockSupabase = {...}; vi.mock(...)
- [most other files follow this pattern]

❌ BROKEN (uninitialized before vi.mock):
- useAuth-rememberMe.spec.ts: let mockSupabaseGlobal: any; vi.mock(...) // initialized in beforeEach!
```

### Why useAuth-rememberMe.spec.ts is Different

**Lines 7-11** (Problem Setup):
```typescript
let mockSupabaseGlobal: any;  // Declared, not initialized

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,  // Captures undefined reference
}));
```

**Lines 36-72** (Late Initialization):
```typescript
beforeEach(() => {
  // ...
  mockAuth = { /* ... */ };
  mockSupabaseGlobal = {  // ⚠️ Set here, too late for module cache
    auth: mockAuth,
  };
});
```

**Impact**: Every test in this file receives `undefined` from `useSupabase()`, causing immediate destructuring failures.

---

## Hidden Connections

### 1. Module Cache Poisoning
When test files load, Vitest caches module resolutions. Once `useAuth-rememberMe.spec.ts` creates a bad mock, subsequent tests may reference the corrupted cache:

```
Test Load Order (Alphabetical):
1. errorScenarios.spec.ts ← Loads first
2. useAccountLinks.spec.ts
3. useActivityFeed.spec.ts
4. useAuth-rememberMe.spec.ts ← 🔴 Creates broken mock cache
5. useAuth.spec.ts ← ❌ May inherit broken cache
6. useCoaches.spec.ts
...
```

### 2. Vitest Mock Hoisting
All `vi.mock()` calls are hoisted to the top of the module, before any variable declarations execute:

```typescript
// Source Code:
let mockSupabaseGlobal: any;        // 1. Executed
vi.mock(..., () => mockSupabaseGlobal);  // 2. Actually hoisted here!

// What Vitest sees:
vi.mock(..., () => mockSupabaseGlobal);  // Executed first
let mockSupabaseGlobal: any;        // Executed second (too late)
```

### 3. Test Isolation Breaking
Using a file-local mock factory breaks the global mock for that file's entire test execution:

```
Global Mock (setup.ts):
- Provides mockSupabase object with all methods configured
- Used by files that import { mockSupabase } from setup

File-Local Mock (useAuth-rememberMe.spec.ts):
- Returns mockSupabaseGlobal (initially undefined)
- Overrides global mock for that module
- Only initialized in beforeEach (after module load)
```

### 4. Why Tests Pass When Run Individually
When running a single test file that has correct mock setup:

```bash
npm run test -- useAuth.spec.ts
```

- Only that file's mock matters
- Global setup.ts mock is used directly (via `import { mockSupabase }`)
- No file-local override
- Tests pass ✅

When running full suite:
```bash
npm run test
```

- Vitest loads ALL test files
- Module cache gets poisoned by first bad mock encountered
- Subsequent tests inherit broken cache
- Tests fail ❌

---

## Root Cause Summary

| Aspect | Issue |
|--------|-------|
| **Primary Cause** | `useAuth-rememberMe.spec.ts` declares mock variable without initializing it before `vi.mock()` hoisting |
| **Trigger** | Variable reference at module scope before assignment in `beforeEach()` |
| **Manifestation** | `useSupabase()` returns `undefined` instead of mock object |
| **Effect** | All method calls destructure `undefined`, causing immediate errors |
| **Test Failures** | 30+ tests across multiple files |
| **Call Count Issue** | Mocks never invoked because composable errors before reaching mock calls |

---

## Why Mocks Aren't Being Called

The investigation found these patterns:

1. **Destructuring Errors First** (Scenario 1: useAuth-rememberMe.spec.ts)
   - Mock returns undefined
   - First line of composable: `const { data, error } = await supabase.auth.getSession()`
   - Crashes before mock call tracking can occur
   - Result: `toHaveBeenCalledTimes(0)` ❌

2. **Module Cache Poisoning** (Scenario 2: useAuth.spec.ts)
   - File-local mock corrupts global module resolution
   - Composable gets undefined reference
   - Same destructuring error
   - Mock never called

3. **Query Chain Breaking** (Scenario 3: useInteractions.spec.ts)
   - `from()` returns query builder
   - `.eq()` should be called on chain
   - But composable errors earlier
   - `query.eq` never invoked

---

## Prevention Strategy

### Immediate Fixes

**Option A: Recommended - Use Global Mock**
Remove all file-local `vi.mock()` definitions and import from setup.ts:

```typescript
// ❌ REMOVE from useAuth-rememberMe.spec.ts:
let mockSupabaseGlobal: any;
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,
}));

// ✅ ADD instead:
import { mockSupabase } from "~/tests/setup";

// In beforeEach:
beforeEach(() => {
  mockSupabase.auth.getSession.mockClear().mockResolvedValue({...});
  mockSupabase.auth.signInWithPassword.mockClear().mockResolvedValue({...});
  // etc.
});
```

**Option B: Fix Variable Initialization**
If keeping file-local mocks, initialize before `vi.mock()`:

```typescript
// ❌ WRONG:
let mockSupabaseGlobal: any;
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,
}));

// ✅ CORRECT:
const mockSupabaseGlobal = {
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    // ... all methods
  },
};
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,
}));
```

### Long-Term Improvements

1. **Consolidate All Mocks in setup.ts**
   - Single source of truth for mock objects
   - No file-local overrides
   - Easier to maintain and debug

2. **Add ESLint Rule**
   - Detect and warn on `vi.mock()` outside setup.ts
   - Force imports from setup instead

3. **Document Mock Pattern**
   - Add CLAUDE.md section on proper mock usage
   - Provide template for beforeEach mock configuration

4. **Update Test Template**
   - Generate new tests with correct mock pattern
   - Example in project documentation

---

## Verification Checklist

- [ ] Identify all 24 test files with local vi.mock()
- [ ] Check each for uninitialized variable pattern
- [ ] Replace with imports from setup.ts
- [ ] Update beforeEach() to configure test-specific mock values
- [ ] Run individual test: `npm run test -- useAuth-rememberMe.spec.ts`
- [ ] Run full suite: `npm run test`
- [ ] Verify all mock call assertions pass
- [ ] Check for cross-test contamination (run random test order)
- [ ] Update CLAUDE.md with mock setup guidelines

---

## Files Requiring Fixes

### Primary Culprit:
- `/tests/unit/composables/useAuth-rememberMe.spec.ts` (Lines 7-11, 69-71)

### Secondary (24 files with vi.mock):
1. errorScenarios.spec.ts
2. useAccountLinks.spec.ts
3. useActivityFeed.spec.ts
4. useCoaches.spec.ts
5. useDocuments.spec.ts
6. useDocumentsConsolidated.spec.ts (also has useErrorHandler mock)
7. useEmailVerification.spec.ts
8. useInteractions-athlete.spec.ts
9. useInteractions.extended.spec.ts
10. useInteractions.spec.ts
11. useOffers.critical.spec.ts
12. useOffers.spec.ts
13. useOnboarding.spec.ts
14. usePasswordReset.spec.ts
15. useProfilePhoto.spec.ts
16. useRecruitingPacket.spec.ts
17. useSchoolLogos.spec.ts
18. useSchools-status-history.spec.ts
19. useSchools.spec.ts
20. useSearchConsolidated.spec.ts
21. useTasks-locking.spec.ts
22. useUserPreferences.spec.ts
23. useViewLogging.spec.ts
24. (one more to identify)

---

## Key Insight

**The problem is NOT that mocks aren't working.** The problem is that:

1. **Mock setup is broken** due to hoisting and uninitialized variables
2. **Composable errors** before it can call mock functions
3. **Test assertions about mock calls** fail because the mock was never invoked (not because it wasn't intercepted)

The mock is intercepting the call correctly (Vitest is replacing the module), but the **mock return value is undefined**, causing the composable to crash before it completes the operation being tested.
