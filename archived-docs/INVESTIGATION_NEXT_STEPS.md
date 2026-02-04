# Investigation Next Steps: Verification Protocol

This document provides systematic steps to verify each diagnosed root cause and confirm the analysis.

---

## Investigation 1: EmailRecruitingPacketModal - Teleport Rendering Issue

### Hypothesis

The component uses `<Teleport to="body">` which renders outside the component tree. Vue Test Utils cannot access elements teleported to the real DOM body.

### Verification Step 1: Check Teleport Behavior

**Command:**

```bash
npm run test -- tests/unit/components/EmailRecruitingPacketModal.spec.ts --reporter=verbose
```

**What to look for:**

- All DOM-based assertions fail (`wrapper.find()`)
- Component instance state exists (`wrapper.vm` works)
- Only negative assertions pass (checking something doesn't exist)

**Success criteria:**

- Tests accessing `wrapper.vm` pass
- Tests accessing `wrapper.find()` fail
- This confirms Teleport is the issue

### Verification Step 2: Debug Teleport Location

**Modify the test file temporarily:**

Add this test:

```typescript
it("DEBUG: check where Teleport content renders", () => {
  console.log("wrapper.html():", wrapper.html());
  console.log("wrapper.element:", wrapper.element);
  console.log(
    "document.body.innerHTML contains 'fixed':",
    document.body.innerHTML.includes("fixed"),
  );
  console.log("body children:", document.body.children.length);
});
```

**Run:**

```bash
npm run test -- tests/unit/components/EmailRecruitingPacketModal.spec.ts --reporter=verbose 2>&1 | grep "DEBUG" -A 5
```

**Expected output:**

- `wrapper.html()` does NOT contain `.fixed` element
- `document.body.innerHTML` might or might not contain `.fixed` (depending on Teleport support)
- This confirms Teleport escapes the wrapper

### Verification Step 3: Check Vue Test Utils Teleport Support

**Research command:**

```bash
npm list @vue/test-utils
```

**Check documentation:**

```bash
cat node_modules/@vue/test-utils/README.md | grep -i "teleport" -A 3
```

**What to check:**

- Does @vue/test-utils support mounting components with Teleport?
- Is there a configuration option to enable it?
- Are there known limitations with Teleport in test-utils?

**Expected finding:**

- Teleport support exists but might require special configuration
- May need `attachTo` option in mount()
- May need to manually append to document.body

### Verification Step 4: Test With Attachment to Real DOM

**Modify test temporarily:**

```typescript
let wrapper: any;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);

  wrapper = mount(EmailRecruitingPacketModal, {
    props: {
      isOpen: true,
      availableCoaches: mockCoaches,
      defaultSubject: "John Smith - Recruiting Profile",
      defaultBody: "Here is my recruiting packet for your review.",
    },
    attachTo: container, // NEW: attach to real DOM
  });
});

afterEach(() => {
  wrapper.unmount();
  document.body.removeChild(container);
});
```

**Run test:**

```bash
npm run test -- tests/unit/components/EmailRecruitingPacketModal.spec.ts
```

**Expected result:**

- If tests pass with `attachTo`, then Teleport needs real DOM
- If tests still fail, then it's a different issue (Transition, happy-dom)

---

## Investigation 2: useInteractions.extended - Mock Chain Setup

### Hypothesis

The module-level mock initialization doesn't properly set up the chainable query object that the composable expects.

### Verification Step 1: Check Mock Return Values

**Add debugging to the test file:**

Modify `tests/unit/composables/useInteractions.extended.spec.ts`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  userStore = useUserStore();

  // ... existing mockQuery setup ...

  // ADD THIS DEBUG CODE
  console.log(
    "mockSupabase.from mock before config:",
    mockSupabase.from.toString(),
  );

  // Reset and configure
  mockSupabase.from.mockClear();
  mockSupabase.from.mockReturnValue(mockQuery);

  console.log(
    "mockSupabase.from mock after config:",
    mockSupabase.from.toString(),
  );
  console.log("mockSupabase.from() returns:", mockSupabase.from("test"));
  console.log(
    "mockSupabase.from().select returns:",
    mockSupabase.from().select,
  );
});
```

**Run test:**

```bash
npm run test -- tests/unit/composables/useInteractions.extended.spec.ts 2>&1 | grep -E "mockSupabase|returns|select" | head -30
```

**Expected output:**

- Show that `mockSupabase.from()` returns the mockQuery
- Show that `mockQuery.select` exists and is a function
- Confirm the chain is properly set up

**If output shows undefined or incorrect returns:**

- The mock setup is not working as expected
- Move to verification step 2

### Verification Step 2: Test Mock Chain Separately

**Create a standalone test file:**

Create `/tests/unit/mocks/supabase-mock.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Mock Setup Verification", () => {
  it("should have proper chainable mock", () => {
    const mockQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      single: vi.fn(),
    };

    // Set up chain
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.single.mockReturnValue(mockQuery);

    // Test the chain
    const result1 = mockQuery.select("*");
    expect(result1).toBe(mockQuery);

    const result2 = result1.eq("field", "value");
    expect(result2).toBe(mockQuery);

    const result3 = result2.order("date", { ascending: true });
    expect(result3).toBe(mockQuery);

    // Verify mock was called
    expect(mockQuery.select).toHaveBeenCalledWith("*");
    expect(mockQuery.eq).toHaveBeenCalledWith("field", "value");
    expect(mockQuery.order).toHaveBeenCalledWith("date", { ascending: true });
  });

  it("should create thenable mock", async () => {
    const mockQuery = {
      then: (onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled),
    };

    const result = await mockQuery;
    expect(result).toEqual({ data: [], error: null });
  });

  it("should combine chain and thenable", async () => {
    const mockQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      then: (onFulfilled) =>
        Promise.resolve({ data: [1, 2, 3], error: null }).then(onFulfilled),
    };

    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);

    const result = await mockQuery.select("*").eq("a", "b");
    expect(result.data).toEqual([1, 2, 3]);
    expect(mockQuery.select).toHaveBeenCalledWith("*");
    expect(mockQuery.eq).toHaveBeenCalledWith("a", "b");
  });
});
```

**Run:**

```bash
npm run test -- tests/unit/mocks/supabase-mock.spec.ts
```

**Expected result:**

- All 3 tests pass
- Confirms that the mock setup concept works
- If any fail, the mock pattern itself is broken

### Verification Step 3: Isolate Composable Mock Issue

**Create test file:**

Create `/tests/unit/composables/useInteractions.mock-isolation.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// DON'T import useInteractions yet
// First, let's understand how the mocks are set up

describe("Mock Isolation Analysis", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should show how setup.ts mock is captured", () => {
    // This will import the mocked useSupabase from setup.ts
    const { useSupabase } = require("~/composables/useSupabase");

    const supabase = useSupabase();
    console.log("supabase object:", Object.keys(supabase));
    console.log("supabase.from is:", typeof supabase.from);
    console.log("supabase.from() returns:", supabase.from("test"));

    // Try to call it
    const result = supabase.from("interactions");
    console.log("from('interactions') returns:", result);
    console.log("result has select?", typeof result?.select);

    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
  });

  it("should show the actual composable behavior", async () => {
    const { useInteractions } = require("~/composables/useInteractions");

    try {
      const { fetchInteractions, interactions } = useInteractions();
      console.log("useInteractions() succeeded");

      // Try to call fetchInteractions
      await fetchInteractions();
      console.log("fetchInteractions succeeded");
    } catch (err) {
      console.log("Error:", err?.message);
      console.log("Stack:", err?.stack?.split("\n").slice(0, 5).join("\n"));
    }
  });
});
```

**Run:**

```bash
npm run test -- tests/unit/composables/useInteractions.mock-isolation.spec.ts 2>&1
```

**What to look for:**

- Does `supabase.from()` return an object with a `.select()` method?
- Does `useInteractions()` call succeed or throw?
- What error is thrown if it fails?

### Verification Step 4: Check User Store Mock State

**Add to the same mock-isolation.spec.ts:**

```typescript
it("should check userStore mock state", () => {
  const { useUserStore } = require("~/stores/user");

  const userStore = useUserStore();
  console.log("userStore.user:", userStore.user);
  console.log("userStore.user is null?", userStore.user === null);
  console.log("userStore.user is object?", typeof userStore.user === "object");

  if (userStore.user) {
    console.log("user.id:", userStore.user.id);
    console.log("user.email:", userStore.user.email);
  }

  expect(userStore).toBeDefined();
});
```

**Run and check:**

- Is `userStore.user` null or an object?
- If null, the module-level `mockUser` is set to null

---

## Investigation 3: Dashboard - Date Logic Edge Case

### Hypothesis

The test creates dates without time components, causing timezone-dependent failures.

### Verification Step 1: Inspect Actual Date Handling

**Add test to dashboard.spec.ts:**

```typescript
it("DEBUG: inspect date creation and filtering", () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  console.log("Current time (now):", now.toISOString());
  console.log("Start of month:", startOfMonth.toISOString());
  console.log(
    "Days difference:",
    (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24),
  );

  const testDate15 = new Date(now.getFullYear(), now.getMonth(), 15);
  const testDate20 = new Date(now.getFullYear(), now.getMonth(), 20);

  console.log("Test date 15:", testDate15.toISOString());
  console.log("Test date 20:", testDate20.toISOString());

  console.log("15 >= startOfMonth?", testDate15 >= startOfMonth);
  console.log("15 <= now?", testDate15 <= now);
  console.log("20 >= startOfMonth?", testDate20 >= startOfMonth);
  console.log("20 <= now?", testDate20 <= now);
});
```

**Run:**

```bash
npm run test -- tests/unit/pages/dashboard.spec.ts --reporter=verbose 2>&1 | grep -E "DEBUG|Current|Start|Test date|difference" | head -20
```

**What to look for:**

- Check if both dates fall within the range [startOfMonth, now]
- Check the day-of-month boundaries

### Verification Step 2: Test with Explicit Timestamps

**Add test:**

```typescript
it("counts interactions with explicit UTC times", () => {
  const now = new Date();

  // Use explicit ISO strings with proper times
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Make test dates using explicit ISO strings (not relying on implicit midnight)
  const date15 = new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15T12:00:00Z`,
  );
  const date20 = new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-20T12:00:00Z`,
  );

  const interactions: Interaction[] = [
    {
      id: "1",
      school_id: "school-1",
      type: "email",
      direction: "outbound",
      occurred_at: date15.toISOString(),
      logged_by: "user-1",
    },
    {
      id: "2",
      school_id: "school-2",
      type: "email",
      direction: "outbound",
      occurred_at: date20.toISOString(),
      logged_by: "user-1",
    },
  ];

  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  console.log("With explicit times, count:", contactCount);
  expect(contactCount).toBe(2);
});
```

**Run:**

```bash
npm run test -- tests/unit/pages/dashboard.spec.ts
```

**Expected result:**

- If this test passes but the original fails, it's a date handling issue
- If both fail, it's a logic mismatch

### Verification Step 3: Compare with Actual Dashboard Component

**Find the dashboard component:**

```bash
find . -name "*dashboard*" -type f | grep -v spec | grep -v node_modules
```

**Locate the actual computed property that counts contacts:**

```bash
grep -r "contactsThisMonth\|contacts.*month\|month.*contact" \
  --include="*.vue" --include="*.ts" | grep -v spec | head -10
```

**Compare:**

- Get the exact code from the dashboard component
- Compare it with the test's filter logic
- Check if they're equivalent

If the test is testing a generic filter but the component uses store state, that's the issue.

---

## Investigation 4: Module-Level Mock State Isolation

### Hypothesis

The module-level mocks and variables are shared across test files, potentially causing state pollution.

### Verification Step 1: Check Isolation Configuration

**Current config:**

```bash
grep -A 2 "isolate:" vitest.config.ts
```

**Expected output:**

```typescript
isolate: process.env.CI ? true : false,
```

**Implication:**

- Local dev: `isolate: false` (fast, but shared state)
- CI: `isolate: true` (slower, but fresh state per file)

### Verification Step 2: Test Isolation Behavior

**Run tests with isolation enabled:**

```bash
CI=true npm run test 2>&1 | tail -20
```

**Compare with without isolation:**

```bash
npm run test 2>&1 | tail -20
```

**What to check:**

- Do the same tests pass/fail in both scenarios?
- Does the test count or timing change significantly?
- If isolation mode fixes failures, it's a state pollution issue

### Verification Step 3: Check Module Variable Mutations

**Add to setup.ts after line 76:**

```typescript
console.log(
  "setup.ts: defaultMockQuery created with ID:",
  (defaultMockQuery.id = Math.random()),
);
console.log(
  "setup.ts: mockSupabase.from mock ID:",
  (mockSupabase.from.__id = Math.random()),
);

afterEach(() => {
  console.log("afterEach: mockSupabase.from mock ID:", mockSupabase.from.__id);
});
```

**Run tests and look for repeated IDs:**

```bash
npm run test 2>&1 | grep "setup.ts\|afterEach" | head -20
```

**Expected finding:**

- If ID is the same across multiple tests, module state is shared
- Different IDs would indicate fresh state

### Verification Step 4: Monitor Mock Call History

**Trace mock calls across test files:**

```bash
npm run test -- tests/unit/composables/useInteractions.extended.spec.ts \
  tests/unit/pages/dashboard.spec.ts \
  --reporter=verbose 2>&1 | grep -E "toHaveBeenCalledWith|Number of calls" | head -30
```

**What to look for:**

- Are mock calls resetting between files?
- Is call history accumulating across files?

---

## Quick Verification Checklist

Run these commands in order to quickly verify the diagnoses:

### 1. Test Individual Files

```bash
echo "=== Test each failing file individually ==="
npm run test -- tests/unit/components/EmailRecruitingPacketModal.spec.ts 2>&1 | tail -5
npm run test -- tests/unit/composables/useInteractions.extended.spec.ts 2>&1 | tail -5
npm run test -- tests/unit/pages/dashboard.spec.ts 2>&1 | tail -5
```

**Expected:** Each passes individually (or shows same errors)

### 2. Check Teleport Support

```bash
echo "=== Check if wrapper can find Teleport content ==="
cat > /tmp/test-teleport.js << 'EOF'
const { mount } = require("@vue/test-utils");
const Teleport = require("vue").Teleport;
console.log("Teleport available:", !!Teleport);
EOF
node /tmp/test-teleport.js
```

### 3. Verify Mock Chain

```bash
echo "=== Verify mock chain setup works ==="
npm run test -- tests/unit/mocks/supabase-mock.spec.ts
```

### 4. Test with Isolation

```bash
echo "=== Run with isolation enabled ==="
CI=true npm run test 2>&1 | grep "FAILED\|Test Files"
```

### 5. Check Setup Files Modifications

```bash
echo "=== Verify no test files modified setup.ts ==="
git diff tests/setup.ts
```

---

## Next Investigation Direction

Based on findings from above, choose the fix path:

### If EmailRecruitingPacketModal passes individually:

→ Issue is real (Teleport rendering)
→ Go to **Fix: Teleport Rendering**

### If useInteractions.extended shows undefined returns:

→ Issue is real (mock setup)
→ Go to **Fix: Mock Chain Initialization**

### If dashboard dates show boundary issues:

→ Issue is real (timezone logic)
→ Go to **Fix: Date Handling**

### If tests pass with CI=true isolate:

→ Issue is isolation pollution
→ Go to **Fix: Module State Pollution**

---

## Documentation

- **DIAGNOSTIC_REPORT.md** - Executive summary and findings
- **INVESTIGATION_DETAILS.md** - Technical deep-dive of each failure
- **INVESTIGATION_NEXT_STEPS.md** - This file, verification protocol

Next phase: Implement fixes based on verification results.
