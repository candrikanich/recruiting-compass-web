# Test Fix Summary: useInteractions.extended.spec.ts

## Problem Statement

The `tests/unit/composables/useInteractions.extended.spec.ts` file had failing tests due to a **mock initialization timing issue**. The mock for `useSupabase` was declared as an uninitialized variable and configured later in `beforeEach`, causing it to be `undefined` when the vi.mock() closure was evaluated.

## Root Cause

```typescript
// WRONG: mockSupabase is undefined when vi.mock() closure is evaluated
let mockSupabase: any; // ← Uninitialized

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase, // ← Returns undefined
}));

describe("useInteractions - Extended", () => {
  beforeEach(() => {
    // This initializes mockSupabase AFTER vi.mock() has already been evaluated
    mockSupabase = { from: vi.fn() };
  });
});
```

**The Problem**: Vitest evaluates the `vi.mock()` callback during module initialization, BEFORE `beforeEach()` runs. At that point, `mockSupabase` is still `undefined`, so every call to `useSupabase()` returns `undefined`.

## Solution

Initialize `mockSupabase` with a concrete object BEFORE the `vi.mock()` declaration:

```typescript
// CORRECT: mockSupabase is initialized before vi.mock()
const mockSupabase = {
  from: vi.fn(), // ← Can be reconfigured per test via mockClear()
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase, // ← Returns initialized object
}));

describe("useInteractions - Extended", () => {
  beforeEach(() => {
    // Reset mock calls but keep the object structure
    mockSupabase.from.mockClear();
    mockSupabase.from.mockReturnValue(mockQuery);
  });
});
```

##Changes Made

### File: `/tests/unit/composables/useInteractions.extended.spec.ts`

**Change 1: Initialize mockSupabase before vi.mock()**

```diff
-let mockSupabase: any;
-
-let mockUser: ...
-
-vi.mock("~/composables/useSupabase", () => ({
-  useSupabase: () => mockSupabase,
-}));
+const mockSupabase = {
+  from: vi.fn(),
+};
+
+let mockUser: ...
+
+vi.mock("~/composables/useSupabase", () => ({
+  useSupabase: () => mockSupabase,
+}));
```

**Change 2: Reset mock instead of reassigning**

```diff
-    // Create fresh mockSupabase for each test
-    mockSupabase = {
-      from: vi.fn(),
-    };
-
-    mockSupabase.from.mockReturnValue(mockQuery);
+    // Reset mockSupabase.from mock for this test
+    mockSupabase.from.mockClear();
+    mockSupabase.from.mockReturnValue(mockQuery);
```

## Verification

### Before Fix

```
Tests:   9 failed | 0 passed (9)
Failures:
- "Cannot read properties of null (reading 'from')"
- "User not authenticated"
- CSV export empty
- Query chaining errors
```

### After Fix

```
Tests:   9 passed | 0 failed (9)
File:    tests/unit/composables/useInteractions.extended.spec.ts ✓

When run with main spec:
Tests:   57 passed | 0 failed (57)
Files:   tests/unit/composables/useInteractions.extended.spec.ts ✓
         tests/unit/composables/useInteractions.spec.ts ✓
```

## Key Learnings

1. **Timing of Module Mock Initialization**: vi.mock() closures are evaluated during module load, not during test execution. Any external state they reference must be initialized before the vi.mock() call.

2. **Const vs Let**: Using `const` for mockSupabase ensures it's initialized at module load time. Using `let` invited the mistake of initializing it later in beforeEach.

3. **Mock Reset Pattern**: Instead of reassigning mockSupabase, use `.mockClear()` on the mock functions to reset call history while preserving the object structure.

4. **Test Isolation**: The fix ensures proper test isolation - each test gets a clean mock history without affecting other tests.

## Files Affected

- `/tests/unit/composables/useInteractions.extended.spec.ts` - FIXED

## Tests Passing

- `useInteractions - Extended` (all 9 tests) ✓
- Compatible with `useInteractions` (48 tests) ✓
- Total: 57 passing tests across both interaction test files
