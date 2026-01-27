# Mock Investigation - Executive Summary

## The Problem

Tests are failing with **"Cannot destructure property 'data' of '(intermediate value)' as it is undefined"** and assertions like **"expected mock to have been called 1 times, but got 0 times"**.

## Root Cause

**File: `useAuth-rememberMe.spec.ts` (lines 7-11)**

```typescript
let mockSupabaseGlobal: any;  // ❌ DECLARED BUT NOT INITIALIZED

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,  // ❌ Returns undefined
}));
```

**The variable initialization happens in `beforeEach()` on line 69, AFTER Vitest module loading completes.**

## What Happens

```
Module Load Phase:
  1. let mockSupabaseGlobal: any;     (undefined)
  2. vi.mock() creates mock returning () => mockSupabaseGlobal  (undefined)

Test Execution Phase:
  3. beforeEach(): mockSupabaseGlobal = {...}  (✅ now has value)
  4. Test calls useAuth().login()
  5. useAuth calls: const supabase = useSupabase()  (returns undefined!)
  6. Composable tries: const { data, error } = await supabase.auth.signInWithPassword(...)
  7. ❌ CRASH: Cannot destructure undefined
  8. ❌ Mock never called, test assertion fails
```

## Why Mocks Appear "Not Called"

The mock IS being intercepted correctly. But:

1. The composable crashes when trying to use the mock result (`undefined`)
2. The crash happens **before** the mock function is even invoked
3. So `toHaveBeenCalledTimes()` correctly reports `0` calls

**Example:**
```typescript
// Mock returns undefined (should return {data: {...}, error: null})
const supabase = useSupabase();  // supabase = undefined

// This line crashes before getSession() is even called
const { data, error } = await supabase.auth.getSession();
                           ^^^^^^^^
                  Cannot destructure undefined
```

## Affected Files

**24 test files** define local `vi.mock()` for useSupabase:
- Most define mock correctly (initialized before vi.mock)
- `useAuth-rememberMe.spec.ts` is the broken one (uninitialized variable)
- Others may fail due to module cache pollution from the broken mock

## The Fix

**Remove the broken local mock. Use the global mock from setup.ts instead:**

```typescript
// ❌ REMOVE THESE LINES (7-11):
let mockSupabaseGlobal: any;
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabaseGlobal,
}));

// ✅ ADD THIS AT TOP:
import { mockSupabase } from "~/tests/setup";

// ✅ UPDATE beforeEach TO CONFIGURE MOCK:
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mockSupabase.auth.signInWithPassword.mockResolvedValue({
    data: { session: null, user: null },
    error: null,
  });
  // ... rest of mock config
});
```

## Cascade Effect

When one test file has a broken mock:

1. **useAuth-rememberMe.spec.ts** loads with undefined mock
2. **Module cache gets poisoned** - Vitest caches module resolutions
3. **Other test files** may inherit the broken mock if they run after it
4. **Tests fail across multiple files** even though each file's code looks correct

This explains why:
- Tests pass when run individually: `npm run test -- useAuth.spec.ts` ✅
- Tests fail when run together: `npm run test` ❌

## Key Insight

The issue is **NOT** that the mock isn't intercepting the module. The issue is:

- **Mock return value is undefined** (should be an object with auth methods)
- **Composable crashes immediately** when trying to use undefined
- **Mock function never gets invoked** because composable errors first
- **Mock call assertions fail** with count 0 (correct, since it was never called)

The fix isn't about making mocks work—they work fine. The fix is about **ensuring mock objects have the right structure before the composable tries to use them**.

## Test Failures Explained

| File | Assertion | Why It Fails |
|------|-----------|-------------|
| useAuth-rememberMe.spec.ts | login() call | `supabase` is undefined, crashes on first method access |
| useAuth.spec.ts | `toHaveBeenCalledTimes(1)` | Mock never called because composable errors first |
| useInteractions.spec.ts | `query.eq.toHaveBeenCalledWith(...)` | Query chain errors on undefined supabase |

All failures have the **same root cause**: uninitialized mock variable.

## Quick Reference

**Problem**: Uninitialized variable in vi.mock closure (hoisting issue)

**Pattern to Avoid**:
```typescript
let mockThing: any;           // ❌ Uninitialized
vi.mock("...", () => mockThing);  // References undefined

// Later in beforeEach:
mockThing = { ... };          // ❌ Too late!
```

**Pattern to Use**:
```typescript
// ✅ Option A: Initialize before vi.mock
const mockThing = { ... };
vi.mock("...", () => mockThing);

// ✅ Option B: Import from setup.ts
import { mockThing } from "~/tests/setup";
// Configure in beforeEach as needed
```

## Files to Check/Fix

1. **useAuth-rememberMe.spec.ts** - Primary issue (remove lines 7-11, add import)
2. **All 24 files with vi.mock()** - Audit for same pattern
3. **tests/setup.ts** - Already correct, is the source of truth

## Documentation Location

Full investigation: `/MOCK_INVESTIGATION.md`
