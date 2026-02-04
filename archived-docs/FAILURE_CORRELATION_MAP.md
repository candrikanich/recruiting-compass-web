# Test Failure Correlation Map

## Failure Distribution

```
TOTAL: 47 failures in 5 test files

EmailRecruitingPacketModal.spec.ts    ████████████████████████████ 28 (59.6%)
useInteractions.extended.spec.ts      █████████ 9 (19.1%)
dashboard.spec.ts                     █ 1 (2.1%)
Other files                           ✓ PASS (79 tests)
```

---

## Failure Types & Correlation Patterns

### Pattern 1: Vue Component Rendering (ISOLATED FAILURE)

**Files affected:** `EmailRecruitingPacketModal.spec.ts`
**Test count:** 28 failures
**Root cause:** Teleport component portal architecture incompatible with Vue Test Utils
**Cascade:** Initial render failure causes all DOM-dependent tests to fail
**Isolation:** Self-contained in this component; doesn't affect other tests

```
Failure sequence:
  "should render modal when isOpen is true" ✗
    └─ wrapper.find(".fixed").exists() returns false
       └─ All 28 subsequent DOM queries also fail
```

**Affected test categories:**

- Rendering checks (5 tests) ✗
- Coach selection (2 tests) ✗
- Manual email input (5 tests) ✗
- Subject/body input (4 tests) ✗
- Form validation (4 tests) ✗
- Send/close actions (3 tests) ✗
- Recipient tags (2 tests) ✗
- BUT: Component state (wrapper.vm) works ✓

**Why 2 tests pass:**

1. "should not render modal when isOpen is false" - Tests negative condition (✓ correct)
2. "should disable send button when form is invalid" - Accesses wrapper.vm only (✓ correct)

---

### Pattern 2: Mock Initialization Chain (SETUP CONFIGURATION ISSUE)

**Files affected:** `useInteractions.extended.spec.ts`
**Test count:** 9 failures
**Root cause:** Module-level mock `mockSupabase.from` not properly initialized as chainable
**Cascade:** Breaks all calls to useInteractions() composable
**Isolation:** Self-contained in this test file; uses file-scoped mocks

```
Failure sequence:
  const { mockSupabase } = {...}
    mockSupabase.from = vi.fn()  // Returns undefined

  useInteractions.fetchInteractions() calls:
    supabase.from("interactions")  // Returns undefined
      .select("*")                 // TypeError: undefined.select is not a function
```

**Mock setup issues identified:**

1. **Module-level mock incomplete:**

   ```typescript
   const mockSupabase = {
     from: vi.fn(), // No return value configured
   };
   ```

2. **Per-test configuration doesn't connect:**

   ```typescript
   beforeEach(() => {
     mockSupabase.from.mockReturnValue(mockQuery); // Might be too late
   });
   ```

3. **User store mock relies on mutable variable:**
   ```typescript
   let mockUser = { id: "user-123" }; // Module-level, can be mutated
   ```

**Affected test categories:**

- Fetch operations (3 tests) - "supabase.from is not called"
- Filter operations (2 tests) - Chain breaks at filter step
- CSV export (2 tests) - No data to export
- Create/delete (2 tests) - User authentication failure
- Error handling (1 test) - Wrong error message

---

### Pattern 3: Date Logic Edge Case (ALGORITHMIC BOUNDARY ISSUE)

**Files affected:** `dashboard.spec.ts`
**Test count:** 1 failure
**Root cause:** Timezone-dependent date creation with implicit midnight time
**Cascade:** Single filter logic affected
**Isolation:** Isolated to date filtering logic

```
Test creates:
  now = 2026-01-26 15:30:45 (current moment)
  date15 = new Date(2026, 0, 15)  // Jan 15 midnight local
  date20 = new Date(2026, 0, 20)  // Jan 20 midnight local

Filter checks:
  date15 >= startOfMonth && date15 <= now  // ✓ True
  date20 >= startOfMonth && date20 <= now  // ? Depends on timezone

Expected: 2 matches
Actual: 1 match
```

**Issues identified:**

1. **Implicit midnight timing:** `new Date(year, month, day)` creates 00:00:00
2. **Timezone conversion:** `.toISOString()` may shift dates in certain zones
3. **Test-to-code mismatch:** Test isolation logic doesn't match dashboard computed property

**Why it matters:**

- Test assumes both dates fall within current month (true)
- But the filter boundary check is timezone-sensitive
- Fails in some timezones, passes in others
- Results in flaky tests

---

## Cross-File Dependency Analysis

### Module-Level Shared State

**From tests/setup.ts:**

```
┌─────────────────────────────────────────────┐
│ Global Test Setup (Shared Across All Tests) │
├─────────────────────────────────────────────┤
│ • mockSupabase (line 78)                    │
│ • defaultMockQuery (line 76)                │
│ • Global console mocks (line 37-42)         │
│ • Global component stubs (line 115-182)     │
└─────────────────────────────────────────────┘
         ↓ Injected into all tests
         │
    Imported by:
    • useInteractions.extended.spec.ts
    • Most composable tests
    • All component tests
```

**From useInteractions.extended.spec.ts:**

```
┌──────────────────────────────────────────────┐
│ File-Level Module Variables (Test Specific)  │
├──────────────────────────────────────────────┤
│ • mockUser (line 12)                         │
│ • mockSupabase.from override (line 9)        │
│ • mockQuery (setup in beforeEach)            │
└──────────────────────────────────────────────┘
         ↓ References outer scope
         │
    Accessible to:
    • All tests in this file
    • NOT other test files (file-scoped vi.mock)
```

---

## Failure Propagation Model

### EmailRecruitingPacketModal Cascade

```
Input: isOpen prop set to true
  ↓
<Teleport to="body"> renders
  ↓
Teleport escapes component tree
  ↓
wrapper.find() searches component tree only
  ↓
Element not found → Test fails
  ↓
CASCADE: All 27 dependent tests also look for same elements
         All 27 fail due to same root cause
```

**Break Point:** Line 41 of test
**Cascade Scope:** Entire component's interaction surface

### useInteractions.extended Mock Cascade

```
Input: beforeEach() mock setup
  ↓
mockSupabase.from configured as chainable
  ↓
useInteractions() calls useSupabase()
  ↓
Gets mocked supabase object
  ↓
Calls supabase.from("interactions")
  ↓
SHOULD return mockQuery, but returns undefined (if setup fails)
  ↓
.select() called on undefined
  ↓
TypeError thrown
  ↓
CASCADE: All 9 tests fail at same point
         Error propagates from any downstream composable call
```

**Break Point:** Mock initialization in beforeEach or module load
**Cascade Scope:** All composable function calls

### Dashboard Filter Cascade

```
Input: Test date creation (implicit midnight)
  ↓
new Date(2026, 0, 20).toISOString() → timezone-dependent result
  ↓
Filter compares dates with timezone mismatch
  ↓
One date falls outside expected range
  ↓
Count is 1 instead of 2
  ↓
Assertion fails
  ↓
NO CASCADE: Only this one test affected
             Doesn't block other tests
```

**Break Point:** Date boundary comparison
**Cascade Scope:** Single test

---

## Hidden Correlations

### Correlation 1: Test Utils Limitations

Both EmailRecruitingPacketModal AND useInteractions.extended share a common root:

- **Issue:** Test environment (happy-dom + Vue Test Utils) has limitations
- **Impact:** Component with portals; Async mock chains with thenable
- **Pattern:** Mismatch between test environment capabilities and production requirements

### Correlation 2: Mock State Lifecycle

The useInteractions.extended failure involves mock state that lives longer than tests expect:

- `mockUser` variable persists across test runs
- `mockSupabase.from` mock configuration might not reset properly
- **Pattern:** Module-level state + per-test setup contradiction

### Correlation 3: Timezone Sensitivity

Dashboard failure is timezone-dependent, suggesting:

- Test environment timezone differs from CI
- Or test written in local timezone, CI runs in different one
- **Pattern:** Environmental dependency in test

---

## Failure Risk Stratification

| Category           | Severity | Risk                           | Fix Complexity                |
| ------------------ | -------- | ------------------------------ | ----------------------------- |
| Teleport Rendering | CRITICAL | Affects all modal interactions | HIGH (may need refactor)      |
| Mock Chain         | HIGH     | Breaks composable testing      | MEDIUM (mock reconfiguration) |
| Date Logic         | MEDIUM   | Flaky (timezone dependent)     | LOW (explicit UTC conversion) |

---

## Recommended Investigation Order

1. **First:** Verify Teleport rendering (affects 28 tests)
   - Check if attachTo option helps
   - Verify Vue Test Utils Teleport support
   - Confirm happy-dom limitations

2. **Second:** Verify mock chain initialization (affects 9 tests)
   - Check mock return values with logging
   - Verify closure timing
   - Test mock setup in isolation

3. **Third:** Verify date logic (affects 1 test)
   - Compare with actual dashboard computed property
   - Test with explicit UTC timestamps
   - Check timezone handling

---

## Key Files for Investigation

**Primary Files:**

- `/tests/unit/components/EmailRecruitingPacketModal.spec.ts` (28 failures)
- `/components/EmailRecruitingPacketModal.vue` (implementation)
- `/tests/unit/composables/useInteractions.extended.spec.ts` (9 failures)
- `/tests/unit/pages/dashboard.spec.ts` (1 failure)

**Supporting Files:**

- `/tests/setup.ts` (global mock configuration)
- `/vitest.config.ts` (test environment config)
- `/composables/useInteractions.ts` (implementation)
- `/stores/user.ts` (user store implementation)

**New Documentation:**

- `/DIAGNOSTIC_REPORT.md` (findings summary)
- `/INVESTIGATION_DETAILS.md` (technical analysis)
- `/INVESTIGATION_NEXT_STEPS.md` (verification steps)
- `/FAILURE_CORRELATION_MAP.md` (this document)

---

## Investigation Completion Checklist

- [ ] Run individual test files to confirm failures
- [ ] Test Teleport with `attachTo` option
- [ ] Verify mock chain with debug logging
- [ ] Compare dashboard filter logic with component implementation
- [ ] Run with `CI=true` to enable isolation
- [ ] Check timezone handling in date tests
- [ ] Document findings in resolution plan
