# Fix Plan: Date Boundary Logic in dashboard.spec.ts

**Category:** MEDIUM
**Failures:** 1/109 tests
**Root Cause:** Timezone-dependent date boundary logic; `new Date(year, month, day)` without time component converts to UTC unpredictably

---

## Problem Analysis

### Current Test Code

**File:** `tests/unit/pages/dashboard.spec.ts`

**Failing test (line 168):**

```typescript
it("counts interactions occurring this month", () => {
  const now = new Date();
  const interactions: Interaction[] = [
    {
      id: "1",
      occurred_at: new Date(
        now.getFullYear(),
        now.getMonth(),
        15,
      ).toISOString(),
      logged_by: "user-1",
    },
    {
      id: "2",
      occurred_at: new Date(
        now.getFullYear(),
        now.getMonth(),
        20,
      ).toISOString(),
      logged_by: "user-1",
    },
  ];

  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  expect(contactCount).toBe(2); // ← Fails: sometimes returns 1
});
```

### Why It Fails

**Issue 1: Local Time vs UTC Conversion**

```typescript
new Date(2026, 0, 20) // Creates local midnight: 2026-01-20 00:00:00
  .toISOString(); // Converts to UTC (shifts by timezone!)
```

**Example timeline by timezone:**

| Timezone         | Local Time          | UTC Conversion          | Result          |
| ---------------- | ------------------- | ----------------------- | --------------- |
| GMT-8 (Pacific)  | 2026-01-20 00:00:00 | 2026-01-20 08:00:00 UTC | ✓ Same day      |
| GMT+5:30 (India) | 2026-01-20 00:00:00 | 2026-01-19 18:30:00 UTC | ✗ Previous day! |

**In GMT+5:30 timezone:**

- Test creates `new Date(2026, 0, 20)` → local midnight
- ISO conversion moves it to UTC → becomes `2026-01-19 18:30:00`
- This is the **previous day** in UTC
- Filter checks `interactionDate >= startOfMonth` (2026-01-01)
- Interaction on "20th" now appears as "19th"
- If `now` is late in the day, the 19th might be included
- But the filter logic might exclude it depending on exact comparison

**Issue 2: Missing `created_at` Fallback**

The filter uses `i.occurred_at || i.created_at || ""`:

- Test data only provides `occurred_at`
- If `occurred_at` is missing, falls back to empty string
- `new Date("")` results in `Invalid Date` (NaN)
- Filter comparison with `Invalid Date` is unpredictable

**Issue 3: Exact Boundary Matching**

```typescript
return interactionDate >= startOfMonth && interactionDate <= now;
```

- `startOfMonth` is calculated by composable (unknown precision)
- `now` is the current moment in test execution
- If `interactionDate` is microsecond off, filter might exclude it

---

## Solution Strategy

**Option A: Use Explicit UTC Timestamps (RECOMMENDED)**

- Create dates with explicit UTC times
- Avoid timezone conversion ambiguity
- Test logic in predictable UTC context
- **Pros:** Simple, deterministic, works everywhere
- **Cons:** Test doesn't match "real" local datetime behavior

**Option B: Mock System Timezone**

- Set test to specific timezone
- Make date creation predictable
- Verify logic works in multiple timezones
- **Pros:** Tests actual timezone handling
- **Cons:** Complex, requires Node.js time mocking

**Option C: Use Timestamp Numbers**

- Create dates from millisecond timestamps
- No timezone interpretation
- Most explicit and clear
- **Pros:** Unambiguous, precise
- **Cons:** Less readable

---

## Recommended Implementation: Option A + C

### Phase 1: Fix Test Data Creation

**File:** `tests/unit/pages/dashboard.spec.ts`

**Current (problematic):**

```typescript
const now = new Date();
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

**Updated (fixed):**

```typescript
// Use explicit UTC timestamps to avoid timezone ambiguity
const now = new Date(); // Current moment
const currentMonth = now.getUTCMonth();
const currentYear = now.getUTCFullYear();

// Create dates using UTC to avoid conversion
const interactions: Interaction[] = [
  {
    id: "1",
    occurred_at: new Date(
      Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
    ).toISOString(),
    logged_by: "user-1",
    created_at: new Date().toISOString(), // Add for fallback
  },
  {
    id: "2",
    occurred_at: new Date(
      Date.UTC(currentYear, currentMonth, 20, 14, 30, 0),
    ).toISOString(),
    logged_by: "user-1",
    created_at: new Date().toISOString(), // Add for fallback
  },
];
```

**Why this works:**

- `Date.UTC()` explicitly creates UTC time, no conversion
- `getUTCMonth()` and `getUTCFullYear()` use UTC, not local
- Includes time component (12:00, 14:30) to avoid midnight edge cases
- `created_at` fallback prevents Invalid Date issues
- Works identically in all timezones

---

### Phase 2: Verify Filter Logic Matches Production

**File:** Check actual dashboard composable/component

**Location:** Find where `contactCount` is calculated (likely in store or page component)

**Current filter (from test):**

```typescript
const contactCount = interactions.filter((i) => {
  const interactionDate = new Date(i.occurred_at || i.created_at || "");
  return interactionDate >= startOfMonth && interactionDate <= now;
}).length;
```

**Verify in production:**

1. Does it use `occurred_at` or `created_at`?
2. How is `startOfMonth` calculated?
3. Is the boundary inclusive (`<=`) or exclusive (`<`)?
4. Does it handle timezones or assume UTC?

**Expected production logic:**

```typescript
// From composable/store/component
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const contactCount = interactions.filter((i) => {
  const interactionDate = new Date(i.occurred_at || i.created_at);
  return (
    interactionDate >= startOfMonth &&
    interactionDate < new Date(now.getFullYear(), now.getMonth() + 1, 1)
  );
}).length;
```

---

### Phase 3: Update Test Assertion

**File:** `tests/unit/pages/dashboard.spec.ts`

**Change the test to match production exactly:**

```typescript
it("counts interactions occurring this month", () => {
  // Get current date in UTC
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  // Create start-of-month boundary
  const startOfMonth = new Date(
    Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
  );

  // Create test interactions on specific days of current month
  const interactions: Interaction[] = [
    {
      id: "1",
      occurred_at: new Date(
        Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
      ).toISOString(),
      logged_by: "user-1",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      occurred_at: new Date(
        Date.UTC(currentYear, currentMonth, 20, 14, 30, 0),
      ).toISOString(),
      logged_by: "user-1",
      created_at: new Date().toISOString(),
    },
  ];

  // Apply production filter logic
  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  // Both interactions in current month
  expect(contactCount).toBe(2);
});
```

**Why this works:**

- Uses `Date.UTC()` to avoid timezone conversion
- Boundary dates are explicit and predictable
- Includes time component to avoid midnight edge cases
- Uses UTC consistently throughout
- Works identically in all timezones

---

### Phase 4: Add Edge Case Tests

**File:** `tests/unit/pages/dashboard.spec.ts`

**Add these test cases to catch future regressions:**

```typescript
it("excludes interactions from previous month", () => {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const startOfMonth = new Date(
    Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
  );

  const interactions: Interaction[] = [
    {
      id: "1",
      // Previous month (should be excluded)
      occurred_at: new Date(
        Date.UTC(currentYear, currentMonth - 1, 28, 12, 0, 0),
      ).toISOString(),
      logged_by: "user-1",
      created_at: new Date().toISOString(),
    },
  ];

  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  expect(contactCount).toBe(0); // Should not count
});

it("excludes interactions from next month", () => {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const startOfMonth = new Date(
    Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
  );

  const interactions: Interaction[] = [
    {
      id: "1",
      // Next month (should be excluded)
      occurred_at: new Date(
        Date.UTC(currentYear, currentMonth + 1, 2, 12, 0, 0),
      ).toISOString(),
      logged_by: "user-1",
      created_at: new Date().toISOString(),
    },
  ];

  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  expect(contactCount).toBe(0); // Should not count
});

it("handles boundary dates at month start", () => {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const startOfMonth = new Date(
    Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
  );

  const interactions: Interaction[] = [
    {
      id: "1",
      // Exactly at month start
      occurred_at: new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 1),
      ).toISOString(), // 1 second after midnight
      logged_by: "user-1",
      created_at: new Date().toISOString(),
    },
  ];

  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  expect(contactCount).toBe(1); // Should include boundary
});

it("falls back to created_at when occurred_at missing", () => {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const startOfMonth = new Date(
    Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
  );

  const interactions: Interaction[] = [
    {
      id: "1",
      occurred_at: null,
      logged_by: "user-1",
      // Fallback to this
      created_at: new Date(
        Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
      ).toISOString(),
    },
  ];

  const contactCount = interactions.filter((i) => {
    const interactionDate = new Date(i.occurred_at || i.created_at || "");
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;

  expect(contactCount).toBe(1); // Should count using created_at
});
```

---

## Implementation Checklist

- [ ] Update main test with explicit UTC timestamps
- [ ] Verify production filter logic matches test expectations
- [ ] Add edge case tests (previous/next month, boundaries, fallbacks)
- [ ] Run test individually to verify it passes
- [ ] Run full test suite to verify no regressions
- [ ] Test in different timezones (if possible) or verify UTC logic
- [ ] Commit changes

---

## Expected Outcomes

**Before:** 1 failure (flaky, timezone-dependent)
**After:** 1 pass (stable, timezone-independent)

**Additional outcomes:**

- Test is now deterministic (same result every run)
- Edge cases covered
- Future developers understand date boundary logic

---

## Alternative: Document Known Limitation

If the production code legitimately relies on local timezone behavior, add a comment:

```typescript
it("counts interactions occurring this month", () => {
  // NOTE: This test uses UTC to ensure consistent behavior across timezones.
  // Production code may use local time; adjust if different behavior expected.
  const now = new Date();
  // ... rest of test ...
});
```

---

## Production Code Considerations

**If the actual dashboard component uses local time (not UTC):**

Then the test should too:

```typescript
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

// Production uses local time
const interactions = [
  {
    id: "1",
    occurred_at: new Date(
      now.getFullYear(),
      now.getMonth(),
      15,
      12,
      0,
      0,
    ).toISOString(),
  },
];

// Test matches production behavior
const contactCount = interactions.filter((i) => {
  const interactionDate = new Date(i.occurred_at);
  return interactionDate >= startOfMonth && interactionDate <= now;
}).length;

expect(contactCount).toBe(1);
```

**Action required:** Verify what the production code actually does before implementing.

---

## Unresolved Questions

1. Does the production dashboard code use UTC or local time for date boundaries?
2. Where is the filter logic actually implemented (store, composable, component)?
3. Are there other date-related tests that might have similar timezone issues?
4. Should dashboard behavior differ by user timezone, or always use UTC?
5. Does the filter need to handle daylight saving time transitions?

---

## Risk Assessment

**Low Risk:**

- Single test file affected
- Change makes test more deterministic, not less
- UTC timestamps are standard practice
- Doesn't modify production code

**Potential Issues:**

- If production uses local time intentionally, test won't catch regressions
  - Mitigation: Verify production code first (required)
- Other timezone-dependent tests might exist
  - Mitigation: Add UTC conversion guide to test documentation

---

## Performance

No performance impact. Test timing unchanged.

---

## Next Steps

1. **REQUIRED:** Check production code to verify it uses UTC or local time
2. Run updated test in multiple timezones or CI environments
3. Verify all date-related tests use consistent approach
4. Consider creating test utility for date creation: `createDateInMonth(month, day, time)`
