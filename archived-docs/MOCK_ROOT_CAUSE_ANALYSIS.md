# Test Failure Root Cause Analysis: useInteractions.extended.spec.ts

## Executive Summary

The test failures in `useInteractions.extended.spec.ts` were caused by **mock module initialization conflicts** between the local vi.mock() declarations in the test file and the global mocks defined in tests/setup.ts. Specifically:

1. **Conflicting mock setup**: Local vi.mock() calls attempt to override globally-mocked modules
2. **Mock state not persisting**: Using functional vi.mock() wrappers with externally-referenced state caused races and null values
3. **vi.clearAllMocks() clearing mock implementations**: The test was clearing mock implementations at the wrong time in the lifecycle

## Root Cause Details

### Cause 1: Conflicting Module Mocks

The test file defined local vi.mock() calls for modules that were already mocked globally in tests/setup.ts:

```typescript
// tests/setup.ts (FIRST - Global mock)
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

// tests/unit/composables/useInteractions.extended.spec.ts (SECOND - Local mock)
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase, // Uses external variable
}));
```

**Problem**: When Vitest loads modules, the LAST vi.mock() declaration wins. But the local vi.mock() uses a wrapper function that returns an external `mockSupabase` variable. When tests run in different orders or in a full suite, this variable may not be initialized correctly before the wrapper is called.

### Cause 2: External State Not Synchronized

The original code tried to reference external mock state through a getter:

```typescript
let mockUser: User | null = {
  /* initial state */
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser; // References external variable
    },
  }),
}));
```

**Problem**: The mock returns a fresh object each time, but that object's `user` getter references an external variable that might not be synchronized with the actual Pinia store. When `setActivePinia(createPinia())` is called in beforeEach, a new store instance is created, but the mock doesn't know about it.

### Cause 3: Mock Implementation Clearing

The test called `vi.clearAllMocks()` at the start of beforeEach:

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // CLEARS THE MOCK SETUP

  // Then tries to use mocks:
  mockSupabase = {
    from: vi.fn().mockReturnValue(mockQuery), // But mockSupabase is still null
  };
});
```

**Problem**: `vi.clearAllMocks()` clears the CALL HISTORY and implementations of mocks. Since `mockSupabase` was declared as `let mockSupabase: any` at module level but ONLY set in beforeEach, calling vi.clearAllMocks() before initializing mockSupabase left it null.

### Cause 4: Mock Thena bility Setup Too Late

The test created a thenable mockQuery but the Supabase composable was already instantiated:

```typescript
mockQuery = {
  select: vi.fn().mockReturnThis(),
  // ...
};
Object.defineProperty(mockQuery, "then", {
  /* thenable */
});
```

**Problem**: By the time the mockQuery's "then" property was defined, the composable might have already tried to use it, causing "is not a function" errors for methods like `.select()`.

## Impact

These failures manifested as:

1. **"Cannot read properties of null (reading 'from')"** - mockSupabase was null when useSupabase() was called
2. **"User not authenticated"** - The mock user store wasn't synchronized with the real Pinia store instance
3. **CSV export empty** - Interactions were never properly fetched because the query mock was broken
4. **Test isolation failures** - Running tests individually passed, but in the full suite they failed due to mock state pollution

## Solution

The proper fix requires choosing ONE of these approaches:

### Approach A: Don't Use Local vi.mock() - Use Global Setup (RECOMMENDED)

Trust the global mock from setup.ts and configure it in beforeEach:

```typescript
import { useSupabase } from "~/composables/useSupabase";

describe("useInteractions - Extended", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history, not setup
    setActivePinia(createPinia());
    userStore = useUserStore();

    // Set user on the REAL store
    userStore.user = { id: "user-123" /* ... */ };

    // Use vi.mocked() to get the mock and configure it
    const mockUseSupabase = vi.mocked(useSupabase);
    const mockSupabase = { from: vi.fn().mockReturnValue(mockQuery) };
    mockUseSupabase.mockReturnValue(mockSupabase);
  });
});
```

### Approach B: Only Mock at Module Level, Don't Reconfigure

Remove the local vi.mock() calls entirely and only test through the global mocks without trying to override them in individual tests.

## Key Learning

In Vitest (and Jest), when a module is already mocked globally:

- ❌ Do NOT try to mock it again in individual test files
- ❌ Do NOT reference external state from within a vi.mock() wrapper function
- ✅ DO use `vi.mocked()` to get the already-mocked function
- ✅ DO configure the mock's behavior in beforeEach using `.mockReturnValue()`, `.mockResolvedValue()`, etc.
- ✅ DO ensure all test state is properly initialized BEFORE the test code runs

## Files Affected

- `/tests/unit/composables/useInteractions.extended.spec.ts` - Test file with conflicting mocks
- `/tests/setup.ts` - Global mock provider (no changes needed)
- `/composables/useInteractions.ts` - The code being tested (no changes needed)

## Verification

To verify the fix is correct:

1. Run the test file individually: `npm run test -- tests/unit/composables/useInteractions.extended.spec.ts`
2. Run the full suite: `npm run test`
3. Verify mock isolation: Tests should not interfere with each other regardless of order
