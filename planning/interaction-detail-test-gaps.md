# Interaction Detail Page - Test Coverage Gaps

**Date:** 2026-02-10
**Status:** Analysis Complete
**Priority:** HIGH - Critical user flow with insufficient coverage

---

## Summary

The interaction detail page (`pages/interactions/[id].vue`) has **insufficient test coverage** with major gaps in:

- Page-level unit tests (0% coverage)
- Child component tests (0% coverage - 4 components untested)
- E2E critical path testing (~15% coverage)
- Error handling and edge cases (0% coverage)

---

## Current State

### ✅ What IS Covered

- Basic E2E navigation test (227 lines in `athlete-interactions.spec.ts`)
- Excellent `InteractionCard` component test (648 lines)

### ❌ What IS NOT Covered

#### 1. Page-Level Tests (NONE)

**File:** `tests/unit/pages/interactions-id.spec.ts` (DOES NOT EXIST)

**Missing Tests:**

```typescript
// Component mounting and initialization
- Mount with valid interaction ID
- Mount with "new" ID (should redirect)
- Mount with invalid ID (404 handling)

// Data fetching
- Fetch interaction on mount
- Fetch related entities (school, coach, event, user)
- Handle fetch errors
- Handle missing related entities

// Computed properties
- school computed from schools store
- coach computed from coaches store
- event computed from events store
- coachFullName concatenation
- loggedByName resolution ("You" vs actual name vs "Unknown")

// User actions
- Export interaction (calls downloadSingleInteractionCSV)
- Delete interaction (shows confirmation, calls deleteInt, redirects)
```

#### 2. Child Component Tests (ALL MISSING)

**A. `DetailCard.vue`** - NO TESTS

```typescript
// Props handling
- label prop renders correctly
- value prop displays (string)
- null value shows "—"
- undefined value shows "—"

// Link rendering
- linkTo creates clickable link
- linkTo undefined shows plain text
- Link has correct classes (text-blue-600 hover:underline)
```

**B. `StatusBadges.vue`** - NO TESTS

```typescript
// Badge rendering
- type badge renders with correct color
- direction badge renders with correct color
- sentiment badge renders when present
- sentiment badge hidden when null

// Color mapping
- getTypeBadgeColor returns correct color
- getDirectionBadgeColor returns correct color
- getSentimentBadgeColor returns correct color
```

**C. `InteractionActions.vue`** - NO TESTS

```typescript
// Event emissions
- Export button emits "export" event
- Delete button emits "delete" event

// Button styling
- Export button has correct classes
- Delete button has correct classes

// Accessibility
- Buttons have proper focus indicators
- Buttons have minimum 44px touch target
```

**D. `AttachmentList.vue`** - NO TESTS

```typescript
// Props handling
- attachments array renders correctly
- attachment count displays "(N)"
- empty array handled gracefully

// File rendering
- Each attachment creates a link
- extractFilename utility called
- Links have target="_blank"
- Links have rel="noopener noreferrer"

// Grid layout
- Attachments displayed in 2-column grid
```

#### 3. E2E Coverage Gaps

**File:** `tests/e2e/tier1-critical/interaction-detail.spec.ts` (DOES NOT EXIST)

**Missing E2E Tests:**

```typescript
test.describe("Interaction Detail Page - Critical Paths", () => {
  test("displays all interaction fields correctly", async ({ page }) => {
    // Navigate to detail page
    // Verify: subject, content, occurred_at, type, direction, sentiment
    // Verify: school name (with link), coach name (with link)
    // Verify: logged by name
  });

  test("navigates to related school when clicking school link", async ({
    page,
  }) => {
    // Click school link
    // Verify navigation to /schools/[id]
  });

  test("navigates to related coach when clicking coach link", async ({
    page,
  }) => {
    // Click coach link (if present)
    // Verify navigation to /coaches/[id]
  });

  test("exports interaction as CSV", async ({ page }) => {
    // Click export button
    // Verify download initiated
    // Verify file contains correct data
  });

  test("deletes interaction with confirmation", async ({ page }) => {
    // Click delete button
    // Verify confirmation dialog appears
    // Confirm deletion
    // Verify redirect to /interactions
    // Verify interaction no longer in list
  });

  test("cancels delete when user declines confirmation", async ({ page }) => {
    // Click delete button
    // Cancel confirmation
    // Verify still on detail page
    // Verify interaction still exists
  });

  test("displays attachments and allows download", async ({ page }) => {
    // Navigate to interaction with attachments
    // Verify attachment count displayed
    // Verify each attachment is clickable link
    // Click attachment link
    // Verify opens in new tab (target="_blank")
  });

  test("handles interaction without attachments gracefully", async ({
    page,
  }) => {
    // Navigate to interaction without attachments
    // Verify no attachment section displayed
  });

  test("shows 'You' for logged by current user", async ({ page }) => {
    // Navigate to interaction logged by current user
    // Verify "Logged By" shows "You"
  });

  test("shows user name for logged by other user", async ({ page }) => {
    // Navigate to interaction logged by another user
    // Verify "Logged By" shows actual name
  });

  test("redirects 'new' ID to add page", async ({ page }) => {
    // Navigate to /interactions/new
    // Verify redirect to /interactions/add
  });

  test("handles missing interaction (404)", async ({ page }) => {
    // Navigate to non-existent interaction ID
    // Verify error message displayed
    // Or verify graceful degradation
  });

  test("handles missing related entities gracefully", async ({ page }) => {
    // Navigate to interaction where school was deleted
    // Verify displays placeholder (not broken link)
    // Same for coach, event
  });

  test("displays loading state while fetching", async ({ page }) => {
    // Intercept slow network
    // Navigate to detail page
    // Verify "Loading interaction..." message
  });

  test("handles network error gracefully", async ({ page }) => {
    // Simulate network failure
    // Navigate to detail page
    // Verify error message displayed
  });
});
```

#### 4. Accessibility Tests (MISSING)

**File:** `tests/e2e/a11y/interaction-detail-wcag.spec.ts` (DOES NOT EXIST)

```typescript
test.describe("Interaction Detail Page - Accessibility", () => {
  test("keyboard navigation works correctly", async ({ page }) => {
    // Tab through all interactive elements
    // Verify focus order: Export → Delete → School link → Coach link → Event link
    // Verify focus indicators visible
  });

  test("screen reader announces content correctly", async ({ page }) => {
    // Verify semantic HTML (h1, h2, sections)
    // Verify ARIA labels on buttons
    // Verify link text is descriptive
  });

  test("color contrast meets WCAG AA standards", async ({ page }) => {
    // Run automated color contrast checks
    // Verify badges have sufficient contrast
  });

  test("touch targets meet minimum size (44x44px)", async ({ page }) => {
    // Verify Export button ≥44px
    // Verify Delete button ≥44px
    // Verify links meet minimum size
  });
});
```

---

## Test Priority Matrix

| Test Type            | Priority  | Effort | Impact | Status      |
| -------------------- | --------- | ------ | ------ | ----------- |
| E2E Critical Paths   | 🔴 HIGH   | Medium | High   | NOT STARTED |
| Component Unit Tests | 🟡 MEDIUM | Low    | Medium | NOT STARTED |
| Page Unit Test       | 🟡 MEDIUM | Medium | Medium | NOT STARTED |
| Accessibility Tests  | 🟢 LOW    | Low    | Medium | NOT STARTED |
| Error Handling E2E   | 🟡 MEDIUM | Medium | High   | NOT STARTED |

---

## Implementation Plan

### Phase 1: E2E Critical Paths (2-3 hours)

**Goal:** Cover happy path user flows
**File:** `tests/e2e/tier1-critical/interaction-detail.spec.ts`

1. Create test file with describe block
2. Implement "displays all fields" test
3. Implement "export interaction" test
4. Implement "delete interaction" test (with confirmation)
5. Implement "attachments display" test
6. Run tests and fix failures

**Acceptance:** All happy path flows passing

---

### Phase 2: Component Unit Tests (1-2 hours)

**Goal:** Test all child components in isolation
**Files:**

- `tests/unit/components/Interaction/DetailCard.spec.ts`
- `tests/unit/components/Interaction/StatusBadges.spec.ts`
- `tests/unit/components/Interaction/InteractionActions.spec.ts`
- `tests/unit/components/Interaction/AttachmentList.spec.ts`

1. Create test files
2. Mock necessary dependencies
3. Test props, emits, rendering
4. Test edge cases (null values, empty arrays)
5. Run tests and achieve 80%+ coverage

**Acceptance:** All components have >80% coverage

---

### Phase 3: Page Unit Test (2 hours)

**Goal:** Test page logic, computed properties, handlers
**File:** `tests/unit/pages/interactions-id.spec.ts`

1. Create test file with necessary mocks
2. Test mounting and data fetching
3. Test computed properties
4. Test user action handlers (export, delete)
5. Test redirect logic ("new" ID)
6. Test error scenarios

**Acceptance:** Page unit test passing with >80% coverage

---

### Phase 4: Error Handling & Edge Cases (1-2 hours)

**Goal:** Ensure robust error handling
**File:** Add to `tests/e2e/tier1-critical/interaction-detail.spec.ts`

1. Test 404 handling
2. Test missing related entities
3. Test network errors
4. Test loading states

**Acceptance:** All error scenarios handled gracefully

---

### Phase 5: Accessibility (1 hour)

**Goal:** WCAG 2.1 AA compliance
**File:** `tests/e2e/a11y/interaction-detail-wcag.spec.ts`

1. Keyboard navigation test
2. Screen reader compatibility test
3. Color contrast verification
4. Touch target size verification

**Acceptance:** No WCAG violations detected

---

## Success Metrics

After completing all phases:

- ✅ E2E coverage: 85%+ of critical paths
- ✅ Component coverage: 80%+ for all 4 child components
- ✅ Page unit coverage: 80%+
- ✅ Error handling: All error states tested
- ✅ Accessibility: WCAG 2.1 AA compliant
- ✅ Zero bugs reported in production for detail page

---

## Example Test Template

### Component Unit Test Template

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DetailCard from "~/components/Interaction/DetailCard.vue";

describe("DetailCard", () => {
  it("renders label and value correctly", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "School",
        value: "University of Test",
      },
    });

    expect(wrapper.find("h3").text()).toBe("School");
    expect(wrapper.find("p").text()).toBe("University of Test");
  });

  it("shows em dash when value is null", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Coach",
        value: null,
      },
    });

    expect(wrapper.find("p").text()).toBe("—");
  });

  it("renders link when linkTo is provided", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "School",
        value: "University of Test",
        linkTo: "/schools/123",
      },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("to")).toBe("/schools/123");
    expect(link.classes()).toContain("text-blue-600");
  });

  it("renders plain text when linkTo is undefined", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "School",
        value: "University of Test",
        linkTo: undefined,
      },
    });

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find("span").text()).toBe("University of Test");
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Interaction Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to interactions list
    await page.goto("/");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Login")');
    await page.waitForURL("**/dashboard");
    await page.goto("/interactions");
  });

  test("displays all interaction fields correctly", async ({ page }) => {
    // Click first interaction
    await page.click('button:has-text("View")');
    await page.waitForURL("**/interactions/**");

    // Verify all fields
    await expect(page.locator("h1")).toBeVisible(); // Subject
    await expect(page.locator("text=Content")).toBeVisible();
    await expect(page.locator("text=School")).toBeVisible();
    await expect(page.locator("text=Coach")).toBeVisible();
    await expect(page.locator("text=Logged By")).toBeVisible();

    // Verify badges
    await expect(page.locator(".bg-blue-100")).toBeVisible(); // Type badge
    await expect(page.locator(".bg-emerald-100")).toBeVisible(); // Direction badge
  });

  test("exports interaction as CSV", async ({ page }) => {
    await page.click('button:has-text("View")');
    await page.waitForURL("**/interactions/**");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Click export
    await page.click('button:has-text("📤 Export")');

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("deletes interaction with confirmation", async ({ page }) => {
    await page.click('button:has-text("View")');
    await page.waitForURL("**/interactions/**");

    // Set up dialog handler
    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain("Are you sure");
      dialog.accept();
    });

    // Click delete
    await page.click('button:has-text("🗑️ Delete")');

    // Verify redirect
    await page.waitForURL("**/interactions");

    // Verify interaction removed from list
    // (implementation depends on how you identify the interaction)
  });
});
```

---

## Related Files

- **Implementation:** `pages/interactions/[id].vue`
- **Components:**
  - `components/Interaction/DetailCard.vue`
  - `components/Interaction/StatusBadges.vue`
  - `components/Interaction/InteractionActions.vue`
  - `components/Interaction/AttachmentList.vue`
- **Utilities:**
  - `utils/formatters.ts` (extractFilename)
  - `utils/dateFormatters.ts` (formatDateTime)
  - `utils/interactions/exportSingleCSV.ts` (downloadSingleInteractionCSV)
  - `utils/sentiment.ts` (badge color functions)
- **Composables:**
  - `composables/useInteractions.ts`
  - `composables/useSchools.ts`
  - `composables/useCoaches.ts`
  - `composables/useEvents.ts`
  - `composables/useUsers.ts`

---

## Notes

- Current test coverage is **critically insufficient** for a user-facing detail page
- The existing `InteractionCard.spec.ts` is an excellent reference for test quality
- Prioritize E2E tests first (highest user impact)
- Consider using the existing school detail page tests as a reference pattern
- Bug fixes should follow Bug-Driven TDD: write failing test first, then fix
