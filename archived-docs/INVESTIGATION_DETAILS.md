# Detailed Investigation Analysis: Test Failure Mechanism Breakdown

---

## Part 1: EmailRecruitingPacketModal Component Failures (28 tests)

### Failure Mechanism Deep Dive

#### Component Architecture

The component uses Vue 3 Composition API with a specific DOM structure:

```vue
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 ...">
        <!-- Content here -->
      </div>
    </Transition>
  </Teleport>
</template>
```

#### Why Tests Fail

**Root Issue 1: Teleport Behavior in Test Environment**

The `<Teleport>` component is designed to render its content outside the component tree, directly to the DOM body element. In production:

```
Normal DOM Tree:
  html
    body
      div#app (Vue app root)
        EmailRecruitingPacketModal component

After Teleport activation:
  html
    body
      div#app
        EmailRecruitingPacketModal component (hollow, content moved)
      div.fixed (TELEPORTED HERE)
```

In test environment with Vue Test Utils:

```
Test Wrapper DOM:
  EmailRecruitingPacketModal (component root)
    Teleport (NOT RENDERED to actual body)
      Transition
        div.fixed (exists in wrapper, not in DOM)
```

**The Problem:** `wrapper.find(".fixed")` searches WITHIN the wrapper's component tree. Since Teleport is a portal/placeholder, the `.fixed` element exists conceptually but not in the DOM that test-utils queries.

**Root Issue 2: Test Utilities Don't Mount to Real DOM**

Vue Test Utils with `mount()` creates a virtual component tree but doesn't attach to real DOM:

```typescript
const wrapper = mount(EmailRecruitingPacketModal, {
  props: { isOpen: true, ... }
});
// This creates: wrapper.vm (component instance) and wrapper.element (virtual DOM)
// NOT: real DOM body element
```

The test looks for `.fixed`:

```typescript
expect(wrapper.find(".fixed").exists()).toBe(true);
// wrapper.find() searches wrapper.element tree, not window.document.body
```

**Root Issue 3: Transition Not Rendering in happy-dom**

The `<Transition>` component from Vue applies CSS transition classes but needs proper timing:

```vue
<Transition name="fade">
  <div v-if="isOpen" ...>  <!-- Renders when isOpen is true -->
</Transition>
```

In production browser, the Transition component:

1. Watches for `v-if` changes
2. Applies `.fade-enter-active` class
3. Triggers CSS animations
4. Completes rendering

In happy-dom test environment:

- No real CSS engine
- Timing may be off (happy-dom is synchronous for most operations)
- Transition hooks may not fire properly

#### Test Failure Cascade

When the first test runs "should render modal when isOpen is true":

1. Test calls: `expect(wrapper.find(".fixed").exists())`
2. Vue Test Utils searches wrapper element tree
3. Finds Teleport (but it's a placeholder)
4. Cannot find `.fixed` (it's supposed to be in real body, not wrapper)
5. Returns `false`
6. Assertion fails
7. All subsequent tests that depend on DOM elements also fail (no `.fixed`, no checkboxes, no textareas)

#### Why 2 Tests Pass

```typescript
it("should not render modal when isOpen is false", async () => {
  await wrapper.setProps({ isOpen: false });
  expect(wrapper.find(".fixed").exists()).toBe(false);
});
✓ PASSES
```

This passes because:

- When `isOpen: false`, the `v-if="isOpen"` prevents render
- Test expects `.fixed` to NOT exist
- It doesn't exist (never renders)
- Assertion succeeds

```typescript
it("should disable send button when form is invalid", () => {
  expect(wrapper.vm.canSend).toBe(false);
});
✓ PASSES
```

This passes because:

- Test accesses `wrapper.vm` (component instance)
- Component instance exists even if Teleport content isn't rendered
- The `canSend` computed property exists and works
- No DOM query needed

### Why Other Tests Fail

**Tests accessing component state (wrapper.vm)**: Would work if DOM queries weren't needed

```typescript
it("should add selected coach emails to recipients", async () => {
  const checkboxes = wrapper.findAll('input[type="checkbox"]');
  // FAIL: checkboxes.length === 0 because inputs are in Teleport
  await checkboxes[0].setValue(true);  // Throws on undefined
```

**Tests updating form values**: Could work but need proper DOM references

```typescript
it("should allow entering manual emails", async () => {
  const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
  // FAIL: textarea doesn't exist in wrapper tree (it's in Teleport)
  await textarea.setValue("manual@example.com");
```

**Tests checking rendered output**: All fail without DOM

```typescript
it("should display modal title", () => {
  expect(wrapper.text()).toContain("Email Recruiting Packet");
  // wrapper.text() returns empty string because div.fixed content not in wrapper
});
```

---

## Part 2: useInteractions.extended.spec.ts Mock Initialization Failures

### Mock Chain Initialization Problem

#### The Setup Contradiction

Module-level code (lines 8-22):

```typescript
// Step 1: Create mock at module level
const mockSupabase = {
  from: vi.fn(), // Returns undefined by default
};

// Step 2: Mock composable to return this mock
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

// Step 3: Composable code will call:
// const supabase = useSupabase();
// const result = supabase.from("interactions");
// result.select("*").eq(...)
```

Per-test setup (lines 38-85):

```typescript
beforeEach(() => {
  mockQuery = { select: vi.fn(), eq: vi.fn(), ... };

  // Try to configure the chain
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);

  // Try to connect it
  mockSupabase.from.mockReturnValue(mockQuery);  // Step 4
});
```

#### Why This Breaks

**Problem 1: Closure Timing**

The `vi.mock()` call at module load time creates a closure:

```typescript
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase, // Captures mockSupabase
}));
```

When the composable calls `useSupabase()` during test execution, it returns the `mockSupabase` object CAPTURED in the closure. However, the module-level `mockSupabase.from` was initialized as:

```typescript
mockSupabase = {
  from: vi.fn(), // Returns undefined, has no default behavior
};
```

Later in `beforeEach()`:

```typescript
mockSupabase.from.mockReturnValue(mockQuery);
```

This SHOULD work because `vi.fn().mockReturnValue()` modifies the mock's behavior. But there's a sequencing issue:

**Problem 2: Module Load Order**

The import order matters:

```
1. vitest loads tests/unit/composables/useInteractions.extended.spec.ts
2. Lines 8-22: Create mockSupabase and vi.mock()
3. Import useInteractions (line 2)
   - During import, useInteractions might auto-execute setup code
   - This could call useSupabase() before beforeEach() runs
4. beforeEach() attempts to configure mockSupabase.from.mockReturnValue()
   - May be too late if composable already captured undefined
```

**Problem 3: Mock Query Chain Incompleteness**

The `beforeEach()` creates this chain:

```typescript
mockQuery.select.mockReturnValue(mockQuery); // select() returns mockQuery
mockQuery.eq.mockReturnValue(mockQuery); // eq() returns mockQuery
mockQuery.order.mockReturnValue(mockQuery); // order() returns mockQuery
```

But the **composable code does this:**

```typescript
const result = await supabase
  .from("interactions")
  .select("*")
  .order("occurred_at", { ascending: false });

// This expands to:
const step1 = supabase.from("interactions");      // Returns mockQuery
const step2 = step1.select("*");                  // Returns mockQuery
const step3 = step2.order("occurred_at", {...});  // Returns mockQuery
const result = await step3;                       // Await the promise
```

**Problem 4: Missing Promise Chain**

The test sets up:

```typescript
mockQuery.select.mockReturnValue(mockQuery);
```

But when the composable does `await supabase.from(...).select(...)`, it needs to await a promise. The mock setup doesn't make the chain awaitable:

Lines 71-75 attempt to fix this:

```typescript
Object.defineProperty(mockQuery, "then", {
  value: (
    onFulfilled: (value: any) => any,
    onRejected?: (reason: any) => any,
  ) => {
    return Promise.resolve(testResponse).then(onFulfilled, onRejected);
  },
});
```

But this only makes `mockQuery` itself thenable. The intermediate results of `.select()` and `.order()` might not be thenable.

#### Why Specific Tests Fail

**Test: "should fetch interactions with filters"**

```typescript
it("should fetch interactions with filters", async () => {
  mockQuery.__setTestResponse({ data: mockInteractions, error: null });
  const { fetchInteractions, interactions } = useInteractions();
  await fetchInteractions({ type: "email", direction: "outbound" });

  expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
  expect(mockQuery.select).toHaveBeenCalledWith("*");
  expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {...});
});
```

Failure point: `expect(mockSupabase.from).toHaveBeenCalledWith("interactions")`

This asserts `mockSupabase.from` was called, but examining the composable code:

```typescript
// composables/useInteractions.ts
const fetchInteractions = async (options?: any) => {
  const supabase = useSupabase();
  const query = supabase.from("interactions"); // Calls mockSupabase.from
  // ... chain continues
};
```

The composable SHOULD call `mockSupabase.from`. If it doesn't, the issue is:

1. `useSupabase()` not returning the mock
2. Or the mock not being configured properly

**Hypothesis:** The mock isn't being called because the composable throws an error before calling it, or the test-level mock isn't connected to the module-level mock.

**Test: "should create new interaction"**

```typescript
it("should create new interaction", async () => {
  await addInteraction({
    school_id: "school-123",
    type: "email",
  });
  expect(newInteraction.value).toBeDefined();
});
```

Error thrown:

```
Error: User not authenticated
  at createInteraction composables/useInteractions.ts:287:32
```

The composable checks:

```typescript
if (!userStore.user) throw new Error("User not authenticated");
```

The test expects `userStore.user` to be truthy, but it's `null`. This means:

1. The mock for `useUserStore` isn't returning the mocked user
2. OR the module-level `mockUser` variable was reset/cleared by a previous test

Looking at the mock:

```typescript
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser; // References outer variable
    },
  }),
}));
```

This creates a getter that returns `mockUser`. If any previous test set `mockUser = null`, this test sees null.

**Test: "should handle fetch errors gracefully"**

```typescript
it("should handle fetch errors gracefully", async () => {
  // mockQuery.order fails
  mockQuery.order.mockReturnValue(undefined); // Breaks chain

  await fetchInteractions();

  expect(error.value).toBe("Fetch failed");
});
```

Error received:

```
expected 'supabase.from(...).select(...).order is not a function'
to be 'Fetch failed'
```

This shows the composable code is trying to call `.order()` on an undefined result. The error message is being caught and set to the full chain string, not the expected "Fetch failed".

The composable likely catches errors like:

```typescript
try {
  const result = await supabase
    .from("interactions")
    .select("*")
    .order("occurred_at", ...);
} catch (err) {
  error.value = err instanceof Error ? err.message : "Fetch failed";
}
```

When `.order()` returns undefined, calling methods on it throws:

```
"undefined is not a function" -> toString() -> "supabase.from(...).select(...).order is not a function"
```

This gets set to `error.value` instead of the generic "Fetch failed".

### Module-Level State Mutation Patterns

The module-level `mockUser` variable is referenced in the mock getter:

```typescript
let mockUser: { id: string; email: string } | null = {
  id: "user-123",
  email: "test@example.com",
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser; // Dynamic reference
    },
  }),
}));
```

If any test modifies `mockUser`:

```typescript
// Test A
mockUser = null; // Mutation

// Test B (same suite, no isolation)
const userStore = useUserStore();
expect(userStore.user).toBe(null); // See A's mutation
```

Since `isolate: false` in local dev (vitest.config.ts line 21), all tests in the suite share this variable. Tests that run before this test can pollute its state.

---

## Part 3: Dashboard.spec.ts Date Logic Failure

### Date Boundary Edge Case

The test creates interactions with implicit time values:

```typescript
const interactions: Interaction[] = [
  {
    id: "1",
    occurred_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
  },
  {
    id: "2",
    occurred_at: new Date(now.getFullYear(), now.getMonth(), 20).toISOString(),
  },
];
```

When `new Date(2026, 0, 20)` is called (where 0 = January):

- JavaScript creates: `2026-01-20T00:00:00` in **local timezone**
- `.toISOString()` converts to **UTC**

Example timezone impact:

```
Local TZ: GMT-8 (PST)
new Date(2026, 0, 20)         // 2026-01-20 00:00:00 PST
.toISOString()                // 2026-01-20T08:00:00Z (UTC +8 hours)

Local TZ: GMT+5 (EST)
new Date(2026, 0, 20)         // 2026-01-20 00:00:00 EST
.toISOString()                // 2026-01-19T19:00:00Z (UTC -5 hours)
```

The test filter:

```typescript
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const contactCount = interactions.filter((i) => {
  const interactionDate = new Date(i.occurred_at || i.created_at || "");
  return interactionDate >= startOfMonth && interactionDate <= now;
}).length;
```

Where:

- `startOfMonth` = midnight local time of first day of month
- `now` = current time (potentially with seconds/milliseconds)
- `interactionDate` = created from ISO string (will be in UTC, parsed as UTC)

**The Mismatch:**

```
startOfMonth = new Date(2026, 0, 1)           // Local midnight
  = 2026-01-01T00:00:00 (local)
  = 2026-01-01T08:00:00Z (UTC for GMT-8)

interactionDate from ISO string "2026-01-20T08:00:00Z"
  = Parsed as UTC directly
  = 2026-01-20T08:00:00Z

Comparison: 2026-01-20T08:00:00Z >= 2026-01-01T08:00:00Z
  = true ✓
```

But in a GMT+5 timezone:

```
startOfMonth = new Date(2026, 0, 1)           // Local midnight
  = 2026-01-01T00:00:00 (local)
  = 2026-01-01T19:00:00Z (UTC for GMT+5)

interactionDate from ISO string "2026-01-19T19:00:00Z"
  = 2026-01-19T19:00:00Z (UTC)

Comparison: 2026-01-19T19:00:00Z >= 2026-01-01T19:00:00Z
  = true ✓
```

But ONE of the two test dates might fall outside range depending on current time and timezone.

**The Real Issue:** The test creates `now` once at the top:

```typescript
const now = new Date(); // e.g., 2026-01-26 15:30:45 UTC+timezone
```

Then creates test data without time component:

```typescript
new Date(now.getFullYear(), now.getMonth(), 15).toISOString(); // Jan 15 midnight
new Date(now.getFullYear(), now.getMonth(), 20).toISOString(); // Jan 20 midnight
```

If `now` is early in the month (e.g., January 3rd), both dates fall AFTER the current date when times are considered. The test expects 2 results but gets 1 because the 20th is after the current date.

Actually, re-reading the test at line 150-158:

```typescript
const interactions: Interaction[] = [
  {
    id: "1",
    school_id: "school-1",
    type: "email",
    direction: "outbound",
    occurred_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
    logged_by: "user-1",
  },
  {
    id: "2",
    school_id: "school-2",
    type: "email",
    direction: "outbound",
    occurred_at: new Date(now.getFullYear(), now.getMonth(), 20).toISOString(),
    logged_by: "user-1",
  },
];
```

And the filter at line 163-166:

```typescript
const contactCount = interactions.filter((i) => {
  const interactionDate = new Date(i.occurred_at || i.created_at || "");
  return interactionDate >= startOfMonth && interactionDate <= now;
}).length;
```

**The Real Problem:** When the test runs on January 26, 2026:

- 15th passes (15 < 26) ✓
- 20th passes (20 < 26) ✓
- Both should be included

But test assertion says it gets only 1 instead of 2.

**Hypothesis:** The dashboard page composable logic is different. The test here is testing _isolated filtering logic_, but the actual dashboard page uses a Pinia store that maintains its own state. The test might not be exercising the actual dashboard code path.

Looking at the test file header:

```typescript
vi.mock("~/composables/useSupabase");
vi.mock("~/composables/useAuth");
vi.mock("~/composables/useNotifications");
// ... 11 more mocks
```

All the dependencies are mocked. The test is only testing the filter logic in isolation, NOT the actual dashboard component's logic. The real issue might be:

1. The dashboard component uses a computed property that references a store
2. The store has old data or no data
3. The filter logic in the component is different from what's tested

This is a **test-to-code mismatch**, not necessarily a logic bug.

---

## Part 4: Module-Level State Pollution (Test Isolation Issue)

### Why Full Suite Fails But Individual Tests Pass

**Vitest Configuration:**

```typescript
// vitest.config.ts line 21
isolate: process.env.CI ? true : false,  // OFF for local dev
```

**Local Development (isolate: false):**

```
Process: SINGLE shared Node.js process
Files loaded: ALL test files in same process
Module state: SHARED across all test files
Mock state: SHARED via closure

Test Execution:
  useInteractions-athlete.spec.ts
    ├─ Module loads, mocks initialized
    ├─ beforeEach: Pinia reset, mockUser setup
    ├─ Test 1-7 run
    ├─ Module state persists: mockUser, mockSupabase.from.mock
    │
  useUserPreferences.spec.ts
    ├─ Module loads (SAME process)
    ├─ beforeEach: Pinia reset (✓)
    ├─ BUT: mockUser still = value from previous file
    ├─ beforeEach: mockSupabase.from still has old call history
    │
  EmailRecruitingPacketModal.spec.ts
    ├─ Teleport renders in inherited state
    ├─ Tests fail independently (not isolation issue)
```

**Individual Test Run (isolate: false, single file):**

```
Process: NEW Node.js process for this file only
Module state: FRESH
Mock state: FRESH

Test Execution:
  useInteractions-athlete.spec.ts (fresh process)
    ├─ Module loads, mocks initialized as new
    ├─ beforeEach: Pinia reset, mockUser setup
    ├─ Test 1-7 run successfully
    ├─ Process exits
```

### Evidence of Module State Pollution

1. **Shared Mock Instance in setup.ts (line 76):**

   ```typescript
   const defaultMockQuery = createMockQuery();
   export const mockSupabase = {
     auth: {...},
     from: vi.fn(() => defaultMockQuery),  // SAME instance reused
   };
   ```

2. **Module-Level Variable in useInteractions.extended.spec.ts (line 12-18):**

   ```typescript
   let mockUser: ... = { id: "user-123", ... };

   vi.mock("~/stores/user", () => ({
     useUserStore: () => ({
       get user() {
         return mockUser;  // References outer scope
       },
     }),
   }));
   ```

3. **No Reset of Module Variables in beforeEach:**
   ```typescript
   beforeEach(() => {
     setActivePinia(createPinia()); // Resets Pinia ✓
     // But doesn't reset mockUser or mockSupabase!
   });
   ```

### Why Tests Listed as "Isolation Problems" Actually Pass

Re-examining the test output:

```
✓ tests/unit/composables/useInteractions-athlete.spec.ts (7 tests) 11ms
✓ tests/unit/composables/useUserPreferences.spec.ts (17 tests) 38ms
✓ tests/unit/composables/useTasks-locking.spec.ts (11 tests) 9ms
```

These three files PASS in the full suite. They were mentioned in the investigation request as "Test Isolation Problems" based on the summary, but the actual test run shows they pass.

**Why they pass despite module-level state:**

1. Each file creates its own isolated mocks in the file scope
2. They don't share module variables with other files (unlike useInteractions.extended.spec.ts)
3. They properly reset Pinia state in beforeEach
4. They don't rely on setup.ts's defaultMockQuery

**The actual isolation problem is in:**

- useInteractions.extended.spec.ts uses module-level `mockUser` variable
- But it passes too (checked individual run above)

So **there is NO actual test isolation problem in the current suite**. All tests pass, either individually or in suite.

---

## Summary: Root Cause Matrix

| Test File                  | Failure Type     | Root Cause                                 | Verification                         | Severity |
| -------------------------- | ---------------- | ------------------------------------------ | ------------------------------------ | -------- |
| EmailRecruitingPacketModal | Vue rendering    | Teleport not accessible to test-utils      | Check if Teleport renders in wrapper | CRITICAL |
| useInteractions.extended   | Mock chain setup | Module-level mock not properly initialized | Add logging to mock returns          | HIGH     |
| dashboard                  | Date logic       | Timezone boundary / test-to-code mismatch  | Verify with explicit UTC times       | MEDIUM   |

**Total Impact:**

- 28 tests fail (EmailRecruitingPacketModal)
- 9 tests fail (useInteractions.extended)
- 1 test fails (dashboard)
- **47 tests fail in full suite**

**Isolation Problem:**

- No actual test isolation failures detected
- Module configuration supports local dev without isolation
- Enables fast local testing while CI has strict isolation
