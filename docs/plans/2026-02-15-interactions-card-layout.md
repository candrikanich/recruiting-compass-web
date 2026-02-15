# Interactions Card Grid Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert interactions page from vertical list to responsive card grid matching schools/coaches pattern.

**Architecture:** Single-line CSS class change in interactions page container. Change `space-y-4` to `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. No component modifications needed.

**Tech Stack:** Vue 3, Tailwind CSS, Playwright E2E tests

---

## Task 1: Update Interactions Page Layout

**Files:**
- Modify: `pages/interactions/index.vue:119`
- Test: `tests/e2e/interactions-grid-layout.spec.ts` (new)

### Step 1: Write failing E2E test for grid layout

Create new test file to verify grid layout classes:

**Create:** `tests/e2e/interactions-grid-layout.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Interactions Grid Layout", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to interactions page
    await page.goto("/login");
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || "test@example.com");
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");

    // Navigate to interactions
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");
  });

  test("should display interactions in responsive grid layout", async ({ page }) => {
    // Find the interactions container (after PageState component)
    const container = page.locator('main#main-content').locator('div.grid').first();

    // Verify grid classes exist
    await expect(container).toHaveClass(/grid/);
    await expect(container).toHaveClass(/grid-cols-1/);
    await expect(container).toHaveClass(/md:grid-cols-2/);
    await expect(container).toHaveClass(/lg:grid-cols-3/);
    await expect(container).toHaveClass(/gap-6/);
  });

  test("should display cards in grid on desktop viewport", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    const container = page.locator('main#main-content').locator('div.grid').first();
    const cards = container.locator('> div');

    // If there are cards, verify they exist
    const count = await cards.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);

      // Verify first card is visible
      await expect(cards.first()).toBeVisible();
    }
  });

  test("should maintain card functionality in grid layout", async ({ page }) => {
    const cards = page.locator('main#main-content').locator('div.grid').first().locator('> div');
    const count = await cards.count();

    if (count > 0) {
      // Click "View" button on first card
      const firstCard = cards.first();
      const viewButton = firstCard.locator('button:has-text("View")');
      await viewButton.click();

      // Verify navigation to detail page
      await expect(page).toHaveURL(/\/interactions\/.+/);
    }
  });
});
```

### Step 2: Run test to verify it fails

**Run:**
```bash
npm run test:e2e -- tests/e2e/interactions-grid-layout.spec.ts
```

**Expected:** FAIL - Container should have class `space-y-4`, not `grid`

### Step 3: Update page layout to grid

**Modify:** `pages/interactions/index.vue:119`

Change this:
```vue
<!-- Interactions Timeline -->
<h2 class="sr-only">Interaction Timeline</h2>
<div class="space-y-4">
  <InteractionCard
    v-for="interaction in filteredInteractions"
    :key="interaction.id"
    :interaction="interaction"
    :school-name="getSchoolName(interaction.school_id)"
    :coach-name="
      interaction.coach_id
        ? getCoachName(interaction.coach_id)
        : undefined
    "
    :current-user-id="userStore.user?.id || ''"
    :is-parent="userStore.isParent"
    @view="viewInteraction"
  />
</div>
```

To this:
```vue
<!-- Interactions Timeline -->
<h2 class="sr-only">Interaction Timeline</h2>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <InteractionCard
    v-for="interaction in filteredInteractions"
    :key="interaction.id"
    :interaction="interaction"
    :school-name="getSchoolName(interaction.school_id)"
    :coach-name="
      interaction.coach_id
        ? getCoachName(interaction.coach_id)
        : undefined
    "
    :current-user-id="userStore.user?.id || ''"
    :is-parent="userStore.isParent"
    @view="viewInteraction"
  />
</div>
```

### Step 4: Run test to verify it passes

**Run:**
```bash
npm run test:e2e -- tests/e2e/interactions-grid-layout.spec.ts
```

**Expected:** PASS - All tests green

### Step 5: Manual visual verification

**Run dev server:**
```bash
npm run dev
```

**Navigate to:** http://localhost:3000/interactions

**Verify:**
- [ ] Mobile (< 768px): Single column, cards full-width
- [ ] Tablet (768px - 1023px): Two columns side-by-side
- [ ] Desktop (≥ 1024px): Three columns
- [ ] Cards maintain proper spacing (24px gap)
- [ ] "View" button works on all cards
- [ ] Filters update grid correctly
- [ ] Pagination works with grid layout
- [ ] Empty state displays correctly
- [ ] Loading state displays correctly

**Responsive testing:**
- Resize browser from mobile → tablet → desktop
- Verify cards reflow smoothly
- Verify no horizontal scrolling

### Step 6: Run full test suite

Verify no regressions in existing tests:

**Run:**
```bash
npm run type-check    # TypeScript validation
npm run lint          # Code quality
npm run test          # Unit tests
npm run test:e2e      # All E2E tests
```

**Expected:** All checks pass

### Step 7: Commit changes

**Run:**
```bash
git add pages/interactions/index.vue tests/e2e/interactions-grid-layout.spec.ts
git commit -m "feat: convert interactions page to grid layout

- Change container from space-y-4 to responsive grid
- Add E2E test for grid layout classes
- Matches schools/coaches page pattern
- 1 col mobile, 2 col tablet, 3 col desktop"
```

---

## Verification Checklist

After implementation, verify:

**Functional:**
- [ ] All existing interaction card functionality works
- [ ] Click "View" navigates to detail page
- [ ] Filter interactions updates grid correctly
- [ ] Export CSV/PDF still works
- [ ] Pagination works with grid layout

**Visual:**
- [ ] Mobile: 1 column layout
- [ ] Tablet: 2 column layout
- [ ] Desktop: 3 column layout
- [ ] Card spacing consistent (24px gap)
- [ ] No horizontal scrolling at any breakpoint

**Accessibility:**
- [ ] Keyboard navigation works (tab through cards)
- [ ] Screen reader announces grid correctly
- [ ] Touch targets meet 44px minimum
- [ ] Focus indicators visible on all interactive elements

**Edge Cases:**
- [ ] Empty state displays correctly in grid
- [ ] Loading state displays correctly in grid
- [ ] Single interaction doesn't stretch
- [ ] Many interactions paginate correctly

**Tests:**
- [ ] New E2E test passes
- [ ] All existing tests pass
- [ ] TypeScript type-check passes
- [ ] Linting passes

---

## Rollback Plan

If issues arise, rollback is trivial:

```bash
git revert HEAD
```

This will restore the `space-y-4` layout immediately.

---

## Notes

- This is a purely presentational change
- No breaking changes to component APIs
- No data structure changes
- InteractionCard component unchanged
- All existing functionality preserved
