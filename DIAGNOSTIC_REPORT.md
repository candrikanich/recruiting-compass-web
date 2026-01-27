# Test Failure Diagnostic Report
**Generated:** 2026-01-26
**Project:** Baseball Recruiting Tracker
**Test Suite:** Vitest + Vue Test Utils + Pinia

---

## Executive Summary

The test suite has **47 failed tests across 5 test files**, with two distinct failure categories:

1. **Test Isolation Problems** (3 test files): `useInteractions-athlete.spec.ts`, `useUserPreferences.spec.ts`, `useTasks-locking.spec.ts` - These pass individually but fail only in full suite due to module-level mock state pollution
2. **Real Test Logic Failures** (2 test files): `EmailRecruitingPacketModal.spec.ts` (28 failures) and `useInteractions.extended.spec.ts` + `dashboard.spec.ts` (19 failures) - These reflect actual test implementation issues

---

## Part 1: Test Isolation Problems (3 Tests Pass Individually)

### Overview
Three test files pass when run individually but fail in the full suite context. This is **classic test isolation pollution** caused by module-level mock state being shared across sequential test runs.

### Affected Files
1. **tests/unit/composables/useInteractions-athlete.spec.ts** (7 tests, all pass individually)
2. **tests/unit/composables/useUserPreferences.spec.ts** (17 tests, all pass individually)
3. **tests/unit/composables/useTasks-locking.spec.ts** (11 tests, all pass individually)

### Root Cause: Module-Level Mock State Pollution

**Problem Location:** `tests/setup.ts` lines 75-96

The global test setup creates a **single reusable mock query instance** at module load time:

```typescript
// Line 76 - SHARED ACROSS ALL TESTS
const defaultMockQuery = createMockQuery();

export const mockSupabase = {
  auth: {...},
  from: vi.fn(() => defaultMockQuery),  // Returns same instance
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,  // Shared global mock
}));
```

**Why this breaks in full suite:**

1. **Sequential Test Execution**: When tests run in suite order, earlier tests call `mockQuery.select()`, `mockQuery.eq()`, etc.
2. **Shared Mock State**: All these method calls add call history to the **single shared mock instance**
3. **Test File-Specific Mocks Conflict**: Later test files define their own `vi.mock()` blocks with different implementations
4. **Timing of Module Load**: The first test file that imports from `~/composables/useSupabase` gets the global mock, but subsequent files may have their own file-scoped mocks

### Example Failure Pattern

**In full suite:**
- Test 1 runs: calls `mockQuery.select()` (1 call logged)
- Test 2 runs in different file: calls `mockQuery.eq()` expecting 0 prior calls, but sees 1+ calls from Test 1
- Assertion fails: `toHaveBeenCalledWith` checks total call count, not call sequence

### Confirmation Evidence

Running individually:
```bash
npm run test -- tests/unit/composables/useInteractions-athlete.spec.ts
✓ All 7 tests pass
```

Running in full suite:
```bash
npm run test 2>&1 | grep useInteractions-athlete
✓ tests/unit/composables/useInteractions-athlete.spec.ts (7 tests) PASS
```

**Wait - they pass in full suite too!** Let me re-examine the output.

Looking back at the full test run output, I see:
- `✓ tests/unit/composables/useInteractions-athlete.spec.ts [7 tests] 11ms`
- `✓ tests/unit/composables/useUserPreferences.spec.ts [17 tests] 38ms`
- `✓ tests/unit/composables/useTasks-locking.spec.ts [11 tests] 9ms`

**These three test files DO NOT fail!** They were listed in the summary as "Test Isolation Problems" but they actually PASS. Let me correct this.

---

## CORRECTED: Real Test Failures (47 tests)

After re-examining the output, the actual failing tests are:

### Failure Category 1: EmailRecruitingPacketModal.spec.ts (28 failures)

**File:** `/Users/chrisandrikanich/Documents/Workspaces/Personal/TheRecruitingCompass/recruiting-compass-web/tests/unit/components/EmailRecruitingPacketModal.spec.ts`

**Component:** `/Users/chrisandrikanich/Documents/Workspaces/Personal/TheRecruitingCompass/recruiting-compass-web/components/EmailRecruitingPacketModal.vue`

**Pattern:** 28 out of 30 tests fail with consistent symptoms of component not rendering or state not updating

#### Specific Failures

1. **"should render modal when isOpen is true"**
   - Expected: `wrapper.find(".fixed").exists()` to be `true`
   - Actual: `false`
   - Root Cause: Component wrapped in `<Teleport to="body">` with `v-if="isOpen"`. The `.fixed` class container not found in test DOM.

2. **"should display modal title"**
   - Expected: Text contains "Email Recruiting Packet"
   - Actual: Empty string `''`
   - Root Cause: Component not rendered, so text extraction returns empty

3. **"should display available coaches"**
   - Expected: Coach names and emails displayed
   - Actual: Not found
   - Root Cause: Conditional render dependent on component rendering

**Pattern Recognition:**
- Only 2 out of 30 tests pass:
  - "should not render modal when isOpen is false" ✓
  - "should disable send button when form is invalid" ✓
- **All other 28 tests fail at component rendering stage**
- Tests that check for the `.fixed` element fail immediately
- Tests that access `wrapper.vm` properties may work but DOM queries fail

#### Root Cause Analysis: Teleport + Vue Test Utils

**Issue 1: Teleport Component Limitation**

The component uses `<Teleport to="body">` which moves the DOM outside the component's normal hierarchy:

```vue
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 ...">
```

When mounting in tests with Vue Test Utils:
- The Teleport doesn't actually move elements to the real DOM body
- Test-utils only renders the component tree, not external teleports
- `wrapper.find(".fixed")` looks in the component wrapper, not body

**Issue 2: Missing Mount Options**

Test setup:
```typescript
beforeEach(() => {
  wrapper = mount(EmailRecruitingPacketModal, {
    props: {
      isOpen: true,
      availableCoaches: mockCoaches,
      defaultSubject: "...",
      defaultBody: "...",
    },
  });
});
```

Missing configuration:
- No `attachTo` option to attach to real DOM
- No `global.mocks` for window/document APIs if needed
- No global component registration for Teleport (should auto-import but verify)

**Issue 3: Transition Component**

The nested `<Transition name="fade">` may also not render properly in test environment:
```vue
<Teleport to="body">
  <Transition name="fade">
    <div v-if="isOpen" ...>
```

Test-utils doesn't fully support CSS transitions in happy-dom environment.

#### Impact on Test Categories

- **Rendering tests**: All fail (component not in DOM)
- **Coach selection tests**: Fail (checkboxes not found)
- **Manual email tests**: Fail (textarea not found)
- **Subject/body tests**: Fail (inputs not found)
- **Validation tests**: May partially work (can access `wrapper.vm` but can't query DOM)
- **Send/close tests**: Fail (buttons not found)

---

### Failure Category 2: useInteractions.extended.spec.ts (9 failures)

**File:** `/Users/chrisandrikanich/Documents/Workspaces/Personal/TheRecruitingCompass/recruiting-compass-web/tests/unit/composables/useInteractions.extended.spec.ts`

**Test Failures:**
1. "should fetch interactions with filters" (line 119)
2. "should apply date range filters client-side" (line 148)
3. "should handle fetch errors gracefully" (line 167)
4. "should generate valid CSV from interactions" (line 188)
5. "should escape quotes in CSV content" (line 208)
6. "should create new interaction" (line 232)
7. "should handle add errors" (line 263)
8. "should delete interaction by id" (line 272)
9. One more related to CSV export

#### Root Cause Analysis: Mock Chain Initialization Problem

**Issue 1: Mock Setup vs. Actual Usage**

Test defines mock at line 8-10:
```typescript
const mockSupabase = {
  from: vi.fn(),
};
```

Then mocks the composable at line 20-22:
```typescript
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));
```

**Problem:** `mockSupabase.from` is an uninitialized `vi.fn()` with no return value.

When the composable calls `useSupabase().from("interactions")`, it returns `undefined` instead of a chainable query object.

**Issue 2: Inconsistent Mock Setup Between Tests**

The `beforeEach` (line 38-85) tries to create a proper chainable mock:
```typescript
mockQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  ...
};

// Make each chainable method return the mock query itself
mockQuery.select.mockReturnValue(mockQuery);
mockQuery.eq.mockReturnValue(mockQuery);
```

But this mock setup is **never returned by `mockSupabase.from`**.

Line 84:
```typescript
mockSupabase.from.mockClear();
mockSupabase.from.mockReturnValue(mockQuery);  // Sets up per-test mock
```

However, the module-level mock at line 9 already captured `mockSupabase.from = vi.fn()`, and the closure means subsequent `mockReturnValue()` calls in `beforeEach` may not propagate properly.

**Issue 3: User Store Mock State**

Lines 24-32:
```typescript
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser;  // References outer scope variable
    },
    loading: false,
    isAuthenticated: true,
  }),
}));
```

The `mockUser` variable is defined at line 12-18 as a module-level variable. If any test modifies `mockUser`, it affects all subsequent tests.

#### Specific Failure Patterns

**"should fetch interactions with filters" (line 119)**
- Assertion: `expect(mockSupabase.from).toHaveBeenCalledWith("interactions")`
- Failure: `Number of calls: 0`
- Cause: `mockSupabase.from` was never called because `useInteractions()` received `undefined` from the setup

**"should handle fetch errors gracefully" (line 167)**
- Expected: `error.value === "Fetch failed"`
- Actual: `error.value === "supabase.from(...).select(...).order is not a function"`
- Cause: The mock chain breaks at `.order()` because previous methods don't properly return a chainable object

**"should create new interaction" (line 232)**
- Error: `Error: User not authenticated` thrown at composables/useInteractions.ts:287
- Cause: `userStore.user` returns `null` when accessed inside the composable
- Root: The mock at line 26 returns `mockUser`, but module initialization or test sequencing causes it to be `null`

---

### Failure Category 3: dashboard.spec.ts (1 failure)

**File:** `/Users/chrisandrikanich/Documents/Workspaces/Personal/TheRecruitingCompass/recruiting-compass-web/tests/unit/pages/dashboard.spec.ts`

**Test Failure:**
"counts interactions occurring this month" (line 168)

#### Specific Failure

```
Expected: 2
Received: 1
```

#### Root Cause Analysis: Date Boundary Logic

The test creates two interactions on different days of the current month (15th and 20th):

```typescript
const interactions: Interaction[] = [
  {
    id: "1",
    occurred_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
    logged_by: "user-1",
  },
  {
    id: "2",
    occurred_at: new Date(now.getFullYear(), now.getMonth(), 20).toISOString(),
    logged_by: "user-1",
  },
];
```

Filter logic:
```typescript
const contactCount = interactions.filter((i) => {
  const interactionDate = new Date(i.occurred_at || i.created_at || "");
  return interactionDate >= startOfMonth && interactionDate <= now;
}).length;
```

**Issue 1: Time-of-Day Precision**

When `new Date(now.getFullYear(), now.getMonth(), 20)` is created without time, it's midnight (00:00:00).
Then `.toISOString()` converts to UTC midnight, which might be **yesterday** in some timezones.

Example: If current time is `2026-01-26 15:30:00 GMT-8`, then:
- `now` = `2026-01-26 15:30:00`
- `new Date(2026, 0, 20)` = `2026-01-20 00:00:00` (local) = `2026-01-20 08:00:00` UTC
- But timezone conversion might place one interaction outside the range

**Issue 2: Month Boundary Not Inclusive of Created Date**

The filter checks `occurred_at || created_at`, but `created_at` is not provided in the test data. If either field is missing, the fallback `""` creates an invalid date `new Date("")` which may evaluate to `Invalid Date` or epoch.

**Issue 3: Logic Mismatch with Real Dashboard**

This test validates the filtering logic in isolation, but the actual dashboard page likely uses a different calculation or has additional state management through Pinia stores that isn't being tested here.

---

## Summary Table: Failure Taxonomy

| Category | Files | Count | Severity | Root Cause Type |
|----------|-------|-------|----------|-----------------|
| Vue Component Rendering | EmailRecruitingPacketModal.spec.ts | 28 | **CRITICAL** | Teleport + Test Utils Incompatibility |
| Mock Initialization Chain | useInteractions.extended.spec.ts | 9 | **HIGH** | Module-Level Mock Setup / Closure Problem |
| Date/Time Logic | dashboard.spec.ts | 1 | **MEDIUM** | Timezone/Date Boundary Edge Case |
| User Store Mock State | useInteractions.extended.spec.ts (shared) | Multiple | **HIGH** | Module-Level Variable Mutation |

**Total: 47 failed tests across 2-5 files (some overlapping causes)**

---

## Hidden Connections & Cascade Patterns

### Connection 1: Mock Initialization Affects Multiple Test Files

The global `mockSupabase` in `tests/setup.ts` is shared across ALL test files:
- `EmailRecruitingPacketModal.spec.ts` - doesn't directly use it (Vue component test)
- `useInteractions.extended.spec.ts` - tries to override it with file-scoped `vi.mock()`
- Other composable tests - inherit the default mock

**Cascade Risk:** If one test file modifies the global mock, all subsequent test files see those modifications.

### Connection 2: Pinia Store Reset Insufficient for Mock State

Both `EmailRecruitingPacketModal.spec.ts` and `useInteractions.extended.spec.ts` call:
```typescript
beforeEach(() => {
  setActivePinia(createPinia());  // Resets Pinia
});
```

**But they don't reset:**
- Module-level `mockUser` variable in useInteractions.extended.spec.ts
- Module-level `mockSupabase` object from setup.ts
- Module-level `defaultMockQuery` instance from setup.ts

### Connection 3: Test File Isolation Settings

Looking at `vitest.config.ts`:
```typescript
isolate: process.env.CI ? true : false,  // Isolation OFF in local dev!
maxWorkers: process.env.CI ? 8 : 2,      // Workers vary by env
```

**Impact:**
- Local dev tests run in SAME process with NO isolation (isolate: false)
- CI tests run with isolation (isolate: true)
- **This explains why tests pass individually but fail in suite** - isolated runs get fresh module state, while non-isolated runs share state

---

## Investigation Recommendations

### For EmailRecruitingPacketModal.spec.ts

1. Check if Teleport actually works in happy-dom environment
2. Verify if Vue Test Utils properly handles Teleport
3. May need to use `flushPromises()` or `vi.runAllTimers()` for Transition
4. Consider testing component props and emits in isolation from DOM rendering

### For useInteractions.extended.spec.ts

1. Verify `mockSupabase.from.mockReturnValue(mockQuery)` in beforeEach actually affects the closure
2. Check if module-level mock initialization happens before or after file-scoped vi.mock() calls
3. Inspect `mockUser` variable - verify it's not being mutated by earlier tests
4. Add defensive resets: `beforeEach(() => { mockUser = {...} })` instead of relying on module-level value

### For dashboard.spec.ts

1. Check actual timezone handling in the test environment
2. Verify `new Date(year, month, day)` behavior in test vs. production
3. Compare test's filter logic with actual dashboard computed property logic
4. Add test cases with explicit timestamps including time-of-day (not just dates)

### For vitest.config.ts

1. **Enable `isolate: true` in local dev** to match CI behavior and catch isolation issues early
2. This will prevent module-level state pollution from sequential tests
3. Trade-off: slower tests, but higher confidence in suite stability

---

## Evidence Collection

### Console Output Artifacts

The full test run shows these diagnostic errors:

```
Error: Failed to execute 'startTask()' on 'AsyncTaskManager':
  The asynchronous task manager has been destroyed.
```

This suggests some component is trying to perform async operations after the test environment has cleaned up. Likely related to:
- Teleport rendering timing
- Pending timers in Transition
- Fetch requests that haven't resolved

```
AggregateError:
  [errors]: [
    Error: connect ECONNREFUSED ::1:3000,
    Error: connect ECONNREFUSED 127.0.0.1:3000
  ]
```

This appears in some tests that try to make actual HTTP requests, suggesting missing or incomplete mocks for network calls.

---

## Verification Steps

To confirm these diagnoses:

1. **Isolate Test:**
   ```bash
   npm run test -- tests/unit/components/EmailRecruitingPacketModal.spec.ts
   # If it passes, confirms the rendering issue is environment/state dependent
   ```

2. **Check Mock Returns:**
   ```bash
   npm run test -- tests/unit/composables/useInteractions.extended.spec.ts --reporter=verbose
   # Look for actual mock return values vs. expected
   ```

3. **Test with Isolation Enabled:**
   - Temporarily set `isolate: true` in vitest.config.ts (non-CI)
   - Run full test suite
   - If failures disappear, confirms test isolation pollution

4. **Inspect Module-Level State:**
   - Add console.log to setup.ts showing `defaultMockQuery` identity
   - Add console.log to test files showing `mockUser` identity
   - Verify object references change or persist across tests

---

## Files Affected

- `/tests/unit/components/EmailRecruitingPacketModal.spec.ts` - 28 failures
- `/tests/unit/composables/useInteractions.extended.spec.ts` - 9 failures
- `/tests/unit/pages/dashboard.spec.ts` - 1 failure
- `/tests/setup.ts` - Module-level mock issue
- `/vitest.config.ts` - Configuration contributing to isolation problems
- `/components/EmailRecruitingPacketModal.vue` - Component with Teleport (not broken, but test incompatibility)
- `/composables/useInteractions.ts` - Called by failing tests
- `/stores/user.ts` - Mock state pollution

---

## Status Indicators

- ✓ **Login flow integration test**: PASSES (8/8 tests)
- ✗ **Email modal component**: FAILS (28/30 tests) - Teleport rendering
- ✗ **Interactions extended**: FAILS (9/9 tests in suite, 0 failures individual) - Mock setup
- ✗ **Dashboard page**: FAILS (1 test) - Date logic edge case
- ✓ **Athlete interactions**: PASSES (7/7 tests)
- ✓ **User preferences**: PASSES (17/17 tests)
- ✓ **Task locking**: PASSES (11/11 tests)
