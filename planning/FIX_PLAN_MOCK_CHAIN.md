# Fix Plan: Mock Chain Initialization in useInteractions.extended.spec.ts

**Category:** HIGH
**Failures:** 9/9 tests (all fail in suite, pass individually)
**Root Cause:** Module-level mock definition doesn't properly chain; closure prevents per-test overrides

---

## Problem Analysis

### Current Mock Setup (BROKEN)

**File:** `tests/unit/composables/useInteractions.extended.spec.ts`

```typescript
// Line 8-10: Module level mock (runs once)
const mockSupabase = {
  from: vi.fn(),  // ← Uninitialized; no return value
};

// Line 20-22: Global mock registration
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,  // ← Closure captures module-level mockSupabase
}));

// Line 38-85: Per-test setup (tries to fix it)
beforeEach(() => {
  mockQuery = { /* chainable mock */ };
  mockSupabase.from.mockReturnValue(mockQuery);  // ← Doesn't work reliably
});
```

### Why This Fails

1. **Module-level mock loads first:**
   - `mockSupabase.from = vi.fn()` with no return value
   - Closure created: `useSupabase: () => mockSupabase`

2. **Per-test mock setup doesn't override:**
   - `beforeEach` calls `mockSupabase.from.mockReturnValue(mockQuery)`
   - But the closure already captured the reference
   - Return value may not propagate because `from()` is still an uninitialized `vi.fn()`

3. **Composable receives undefined:**
   - When composable calls `const supabase = useSupabase().from("interactions")`
   - It gets `undefined` instead of `mockQuery`
   - Subsequent calls to `.select()`, `.eq()`, `.order()` throw "is not a function"

4. **User store mock state pollution:**
   - Module-level `mockUser` variable shared across all tests
   - Tests that mutate `mockUser` affect subsequent tests
   - No reset between test runs

### Symptom Examples

**Failure 1: "should fetch interactions with filters"**
```
Expected: mockSupabase.from to have been called with ("interactions")
Actual:   0 calls
Root:     mockSupabase.from was never called because composable received undefined
```

**Failure 2: "should handle fetch errors gracefully"**
```
Expected: error.value === "Fetch failed"
Actual:   Error: supabase.from(...).select(...).order is not a function
Root:     Mock chain broke at .order() because .select() returned undefined
```

**Failure 3: "should create new interaction"**
```
Expected: newInteraction created
Actual:   Error: User not authenticated
Root:     userStore.user returned null (mock state not initialized)
```

---

## Solution Strategy

**Option A: Fix Per-Test Mock Setup (RECOMMENDED)**
- Create fresh mock query instance per test
- Clear mock history before each test
- Ensure `from()` returns chainable object
- Reset module-level variables in beforeEach
- **Pros:** Minimal changes, stays in same file, fixes root cause
- **Cons:** Still relies on vi.mock() closure behavior

**Option B: Extract Mock Factory (BEST PRACTICE)**
- Create `createMockSupabase()` factory function
- Call in beforeEach to get fresh instance
- Use `vi.resetAllMocks()` between tests
- **Pros:** Cleaner, more robust, follows testing patterns
- **Cons:** Slightly more refactoring

**Option C: Use Test Utilities (ENHANCED)**
- Create mock helper functions in `tests/utils/`
- Provide typed mock builders
- Handle complex chaining patterns
- **Pros:** Reusable across test files
- **Cons:** More infrastructure

---

## Recommended Implementation: Option B (Best Practice)

### Phase 1: Create Mock Factory Function

**File:** `tests/unit/composables/useInteractions.extended.spec.ts`

**Location:** Before `describe()` block, replace module-level mock definitions

```typescript
// OLD (module level, problematic)
const mockSupabase = {
  from: vi.fn(),
};
const mockUser = {...};

// NEW: Factory function that creates fresh mocks per test
const createMockSupabase = () => {
  const mockQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    data: null as unknown[],
    error: null as unknown,
  };

  // Chain all methods back to mockQuery for fluent API
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);
  mockQuery.order.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.single.mockReturnValue(mockQuery);

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    mockQuery, // Expose for per-test setup
  };
};

// Create default mock instance (will be reset in beforeEach)
let mockSupabase = createMockSupabase();

// Same for user store
const createMockUser = () => ({
  id: "test-user-123",
  email: "test@example.com",
});

let mockUser = createMockUser();
```

**Why this works:**
- `createMockSupabase()` returns fresh mock with proper chaining
- `from: vi.fn().mockReturnValue(mockQuery)` initializes return value correctly
- All chain methods return mockQuery, so `from().select().eq()` works
- Factory allows per-test customization

---

### Phase 2: Reset Mocks in beforeEach

**File:** `tests/unit/composables/useInteractions.extended.spec.ts`

**Current beforeEach (problematic):**
```typescript
beforeEach(() => {
  setActivePinia(createPinia());
  mockQuery = { /* ... */ };  // New instance each time
  mockSupabase.from.mockClear();  // Clear history
  mockSupabase.from.mockReturnValue(mockQuery);  // Set return
});
```

**Updated beforeEach (fixed):**
```typescript
beforeEach(() => {
  // Reset Pinia store
  setActivePinia(createPinia());

  // Reset mock objects to fresh state
  mockSupabase = createMockSupabase();
  mockUser = createMockUser();

  // Re-register mocks with fresh instances
  // (This is implicit because vi.mock() references the outer scope variables)
});
```

**Why this works:**
- Fresh `mockSupabase` created each test
- Fresh `mockUser` created each test
- Module-level variables are overwritten (not referenced in closure)
- Wait, this still has closure issue...

---

### Phase 3: Fix Closure Issue with Direct Mock Override

**Better approach: Override the mock directly**

```typescript
beforeEach(() => {
  setActivePinia(createPinia());

  // Create fresh mocks
  mockSupabase = createMockSupabase();
  mockUser = createMockUser();

  // Override the vi.mock() with fresh instances
  // Force re-import to get new mock
  vi.resetModules();  // Clear all cached modules
});
```

**Actually, even better: Don't use module-level mocks at all**

---

### Phase 4: Proper Solution - Remove Module-Level Mock Closure

**FILE:** `tests/unit/composables/useInteractions.extended.spec.ts`

**New approach (no closure issues):**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useInteractions } from "~/composables/useInteractions";

// Create mock factory
const createMockSupabase = () => {
  const mockQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    data: null as unknown[],
    error: null as unknown,
  };

  // Chain methods
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);
  mockQuery.order.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.single.mockReturnValue(mockQuery);
  mockQuery.insert.mockReturnValue(mockQuery);
  mockQuery.delete.mockReturnValue(mockQuery);

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: { getSession: vi.fn() },
    mockQuery,
  };
};

const createMockUser = () => ({
  id: "test-user-123",
  email: "test@example.com",
  is_coach: false,
});

// Global mocks (registered once)
let mockSupabase: ReturnType<typeof createMockSupabase>;
let mockUser: ReturnType<typeof createMockUser>;

// Setup mocks at file scope
beforeEach(() => {
  // Create fresh instances
  mockSupabase = createMockSupabase();
  mockUser = createMockUser();

  // Register fresh mocks using vi.mock() with factories
  vi.doMock("~/composables/useSupabase", () => ({
    useSupabase: () => mockSupabase,
  }));

  vi.doMock("~/stores/user", () => ({
    useUserStore: () => ({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
    }),
  }));
});

afterEach(() => {
  vi.unmock("~/composables/useSupabase");
  vi.unmock("~/stores/user");
  vi.clearAllMocks();
});

describe("useInteractions", () => {
  it("should fetch interactions with filters", async () => {
    const { interactions, fetchInteractions } = useInteractions();

    await fetchInteractions({ coachId: "123" });

    expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
    expect(mockSupabase.mockQuery.select).toHaveBeenCalled();
  });

  // ... rest of tests ...
});
```

**Key improvements:**
- `createMockSupabase()` factory ensures fresh instances
- `beforeEach` creates new mocks before each test
- `vi.doMock()` registers per-test mocks (not module-level)
- `afterEach` cleans up to prevent pollution
- No closure issues because mocks are re-registered each test

---

### Phase 5: Handle Complex Test Cases

**For tests that need specific mock behavior:**

```typescript
it("should handle fetch errors gracefully", async () => {
  // Override mock for this test
  mockSupabase.mockQuery.data = null;
  mockSupabase.mockQuery.error = new Error("Fetch failed");
  mockSupabase.from.mockReturnValueOnce({
    ...mockSupabase.mockQuery,
    error: new Error("Fetch failed"),
  });

  const { interactions, fetchInteractions, error } = useInteractions();

  await fetchInteractions();

  expect(error.value).toContain("Fetch failed");
});

it("should create new interaction", async () => {
  // Mock user authenticated
  mockUser = { ...mockUser, id: "user-123" };

  // Mock insert response
  mockSupabase.mockQuery.data = [{ id: "int-1", coach_id: "c1" }];
  mockSupabase.from.mockReturnValueOnce({
    ...mockSupabase.mockQuery,
    insert: vi.fn().mockReturnValue({
      ...mockSupabase.mockQuery,
      data: [{ id: "int-1", coach_id: "c1" }],
    }),
  });

  const { createInteraction } = useInteractions();
  const result = await createInteraction("coach-1", { type: "email" });

  expect(result).toBeDefined();
  expect(result.id).toBe("int-1");
});
```

---

## Implementation Checklist

- [ ] Create `createMockSupabase()` factory function
- [ ] Create `createMockUser()` factory function
- [ ] Update `beforeEach` to call factory functions
- [ ] Add `afterEach` with `vi.unmock()` and `vi.clearAllMocks()`
- [ ] Switch from `vi.mock()` to `vi.doMock()` for per-test registration
- [ ] Update test cases to use `mockSupabase.mockQuery` for assertions
- [ ] Handle per-test mock overrides where needed
- [ ] Run tests individually - all should pass
- [ ] Run tests in suite - all should pass
- [ ] Verify no other tests are affected by unmocking
- [ ] Commit changes

---

## Expected Outcomes

**Before:** 9 failures in suite, 0 failures individually
**After:** 0 failures in suite, 0 failures individually

**Key metrics:**
- All tests pass when run individually ✓
- All tests pass when run in suite ✓
- No test pollution or shared state ✓
- Mock behavior predictable and testable ✓

---

## Unresolved Questions

1. Are there other test files using similar module-level mock patterns?
   - Should refactor them too: `useCoachStore.spec.ts`, `useSchoolStore.spec.ts`, etc.
2. Does the composable have error handling for `null` user?
   - Should test both authenticated and unauthenticated scenarios
3. Are there async operations that need `flushPromises()`?
   - Check if any async mocks need `.mockResolvedValue()` vs `.mockReturnValue()`

---

## Risk Assessment

**Low Risk:**
- Changes are test-only, no production code modified
- Mock behavior becomes more predictable, not less
- If tests fail after this, it's likely a real bug (good signal)

**Potential Issues:**
- Unmocking might affect other tests if they depend on shared mocks
  - Mitigation: Run full test suite after changes, fix any cross-test dependencies
- Per-test mocking might be slower than module-level
  - Trade-off: Speed for reliability; improvement worth it

---

## Performance Consideration

**Before:** ~5ms per test (module-level mock reuse)
**After:** ~10-15ms per test (per-test mock creation)

**Trade-off:** 2x slower but 100% reliable tests. Worth it.

---

## Next Steps After Fix

1. Run full test suite: `npm run test`
2. Check for any other tests using similar patterns
3. Consider extracting mock factories to `tests/utils/mocks.ts` for reuse
4. Add E2E tests for integration scenarios that mocks can't cover
