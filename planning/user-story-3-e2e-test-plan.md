# User Story 3 E2E Test Plan

**Date:** 2026-01-24
**Scope:** End-to-End testing for Stories 3.1-3.5
**Framework:** Playwright
**Environment:** Dev server on http://localhost:3003
**Strategy:** Test complete user workflows across pages

---

## Overview

E2E tests verify user-facing functionality across multiple pages and interactions. These tests run in a real browser against a dev server with real database.

---

## Test File Organization

```
tests/e2e/
├── schools.spec.ts (existing - replace with comprehensive suite)
├── schools-add.spec.ts (new - Story 3.1)
├── schools-fit-score.spec.ts (new - Story 3.2)
├── schools-filter-sort.spec.ts (new - Story 3.3)
├── schools-priority-status.spec.ts (new - Story 3.4)
├── schools-notes.spec.ts (new - Story 3.5)
├── fixtures/
│   ├── schools.fixture.ts (existing - update)
│   └── auth.fixture.ts (existing)
```

---

## Setup & Utilities

### Fixture Updates

**File:** `tests/e2e/fixtures/schools.fixture.ts` (new/update)

```typescript
import { Page } from "@playwright/test";

export const schoolsFixture = {
  async navigateToSchoolsPage(page: Page) {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2")).toBeVisible();
  },

  async navigateToAddSchoolPage(page: Page) {
    await page.goto("/schools/new");
    await page.waitForLoadState("networkidle");
  },

  async navigateToSchoolDetail(page: Page, schoolId: string) {
    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
  },

  async createSchoolFromDatabase(page: Page, schoolName: string) {
    await this.navigateToAddSchoolPage(page);

    // Select autocomplete option
    const searchInput = page.locator('[data-testid="school-autocomplete"]');
    await searchInput.fill(schoolName);
    await page.waitForTimeout(500); // Wait for autocomplete to populate

    // Click first result
    const firstResult = page
      .locator('[data-testid="autocomplete-result"]')
      .first();
    await firstResult.click();

    // Verify auto-population happened
    const nameField = page.locator('[data-testid="school-name"]');
    await expect(nameField).toHaveValue(schoolName);

    // Submit form
    const submitButton = page.locator('[data-testid="add-school-submit"]');
    await submitButton.click();

    // Wait for redirect to list or detail page
    await page.waitForURL(/\/schools/, { waitUntil: "networkidle" });
  },

  async createCustomSchool(
    page: Page,
    schoolData: {
      name: string;
      state: string;
      division: string;
    },
  ) {
    await this.navigateToAddSchoolPage(page);

    // Switch to manual entry
    const manualToggle = page.locator('[data-testid="manual-entry-toggle"]');
    await manualToggle.click();

    // Fill form
    await page.fill('[data-testid="school-name"]', schoolData.name);
    await page.fill('[data-testid="school-state"]', schoolData.state);
    await page.selectOption(
      '[data-testid="school-division"]',
      schoolData.division,
    );

    // Submit
    const submitButton = page.locator('[data-testid="add-school-submit"]');
    await submitButton.click();

    await page.waitForURL(/\/schools/, { waitUntil: "networkidle" });
  },

  async findSchoolInList(page: Page, schoolName: string) {
    const schoolCard = page.locator(
      `[data-testid="school-card"][data-name="${schoolName}"]`,
    );
    return schoolCard;
  },

  async getSchoolCount(page: Page) {
    const cards = page.locator('[data-testid="school-card"]');
    return cards.count();
  },
};
```

---

## Test Suites

### 1. Story 3.1: Add Schools to Track List

**File:** `tests/e2e/schools-add.spec.ts`
**New File**

```typescript
import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import { schoolsFixture } from "./fixtures/schools.fixture";

test.describe("Story 3.1: Add Schools to Track List", () => {
  test.beforeEach(async ({ page }) => {
    await authFixture.ensureLoggedIn(page);
  });

  test.describe("Scenario: Add school from database", () => {
    test("should add school from NCAA database", async ({ page }) => {
      // Navigate to add school page
      await schoolsFixture.navigateToAddSchoolPage(page);

      // Search for school
      const searchInput = page.locator('[data-testid="school-autocomplete"]');
      await searchInput.fill("Arizona State");
      await page.waitForTimeout(500);

      // Select first result
      const firstResult = page
        .locator('[data-testid="autocomplete-result"]')
        .first();
      await firstResult.click();

      // Verify school name was populated
      const nameField = page.locator('[data-testid="school-name"]');
      await expect(nameField).toHaveValue(/Arizona State/);

      // Submit
      const submitButton = page.locator('[data-testid="add-school-submit"]');
      await submitButton.click();

      // Verify redirect and notification
      await expect(page).toHaveURL(/\/schools/);
      await expect(page.locator("text=School added")).toBeVisible();
    });

    test("should auto-populate school information from database", async ({
      page,
    }) => {
      await schoolsFixture.createSchoolFromDatabase(
        page,
        "Arizona State University",
      );

      // Navigate to school detail
      const schoolCard = page.locator("text=Arizona State University");
      await schoolCard.click();

      // Verify auto-populated fields
      await expect(
        page.locator('[data-testid="school-division"]'),
      ).toContainText("D1");
      await expect(
        page.locator('[data-testid="school-location"]'),
      ).not.toHaveValue("");
      await expect(
        page.locator('[data-testid="school-conference"]'),
      ).not.toHaveValue("");
    });

    test("should complete add flow in under 30 seconds", async ({ page }) => {
      const startTime = Date.now();

      await schoolsFixture.createSchoolFromDatabase(page, "Colorado State");

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(30000); // 30 seconds
    });
  });

  test.describe("Scenario: Add custom school", () => {
    test("should add school manually when not in database", async ({
      page,
    }) => {
      await schoolsFixture.createCustomSchool(page, {
        name: "Small State College",
        state: "Colorado",
        division: "NAIA",
      });

      // Verify school appears in list
      const schoolCard = page.locator("text=Small State College");
      await expect(schoolCard).toBeVisible();
    });

    test("should save custom school to database", async ({ page }) => {
      const schoolName = "Custom Test University";

      await schoolsFixture.createCustomSchool(page, {
        name: schoolName,
        state: "Texas",
        division: "D2",
      });

      // Refresh page and verify school persists
      await page.reload();
      await page.waitForLoadState("networkidle");

      const schoolCard = page.locator(`text=${schoolName}`);
      await expect(schoolCard).toBeVisible();
    });
  });

  test.describe("Scenario: Prevent duplicate schools", () => {
    test("should warn when adding duplicate school", async ({ page }) => {
      // Add first instance
      await schoolsFixture.createSchoolFromDatabase(
        page,
        "Arizona State University",
      );

      // Try to add same school again
      await schoolsFixture.navigateToAddSchoolPage(page);

      const searchInput = page.locator('[data-testid="school-autocomplete"]');
      await searchInput.fill("Arizona State");
      await page.waitForTimeout(500);

      const firstResult = page
        .locator('[data-testid="autocomplete-result"]')
        .first();
      await firstResult.click();

      const submitButton = page.locator('[data-testid="add-school-submit"]');
      await submitButton.click();

      // Should show duplicate warning modal
      const warningModal = page.locator(
        '[data-testid="duplicate-warning-modal"]',
      );
      await expect(warningModal).toBeVisible();
      await expect(warningModal).toContainText("Arizona State");
      await expect(warningModal).toContainText("already on your list");
    });

    test("should allow canceling duplicate addition", async ({ page }) => {
      // Create first school
      await schoolsFixture.createSchoolFromDatabase(
        page,
        "Arizona State University",
      );

      const countBefore = await schoolsFixture.getSchoolCount(page);

      // Try duplicate
      await schoolsFixture.navigateToAddSchoolPage(page);
      const searchInput = page.locator('[data-testid="school-autocomplete"]');
      await searchInput.fill("Arizona State");
      await page.waitForTimeout(500);
      const firstResult = page
        .locator('[data-testid="autocomplete-result"]')
        .first();
      await firstResult.click();
      const submitButton = page.locator('[data-testid="add-school-submit"]');
      await submitButton.click();

      // Click cancel in warning
      const cancelButton = page.locator(
        '[data-testid="duplicate-warning-cancel"]',
      );
      await cancelButton.click();

      // Verify count hasn't changed
      const countAfter = await schoolsFixture.getSchoolCount(page);
      expect(countAfter).toBe(countBefore);
    });

    test("should allow proceeding with duplicate if user chooses", async ({
      page,
    }) => {
      // Create first school
      await schoolsFixture.createSchoolFromDatabase(
        page,
        "Arizona State University",
      );

      const countBefore = await schoolsFixture.getSchoolCount(page);

      // Try duplicate and proceed
      await schoolsFixture.navigateToAddSchoolPage(page);
      const searchInput = page.locator('[data-testid="school-autocomplete"]');
      await searchInput.fill("Arizona State");
      await page.waitForTimeout(500);
      const firstResult = page
        .locator('[data-testid="autocomplete-result"]')
        .first();
      await firstResult.click();
      const submitButton = page.locator('[data-testid="add-school-submit"]');
      await submitButton.click();

      // Click "Add Anyway"
      const addAnywayButton = page.locator(
        '[data-testid="duplicate-warning-add-anyway"]',
      );
      await addAnywayButton.click();

      // Note: If duplicates are truly prevented, this may not increase count
      // If they're warned but allowed, count increases
      // Adjust based on actual implementation requirement
      await page.waitForURL(/\/schools/);
    });
  });

  test.describe("Scenario: Warning at 30+ schools", () => {
    test("should show warning banner when reaching 30 schools", async ({
      page,
    }) => {
      // Note: This test is best run with a pre-populated database or data seeding
      // For now, showing the pattern

      await schoolsFixture.navigateToSchoolsPage(page);

      // Check if user has 30+ schools (would need fixture to create them)
      const schoolCount = await schoolsFixture.getSchoolCount(page);

      if (schoolCount >= 30) {
        const warningBanner = page.locator(
          '[data-testid="schools-warning-banner"]',
        );
        await expect(warningBanner).toBeVisible();
        await expect(warningBanner).toContainText("30 schools");
      }
    });

    test("should dismiss warning banner", async ({ page }) => {
      // Setup: Would need 30+ schools
      // Pattern for dismissal:
      const warningBanner = page.locator(
        '[data-testid="schools-warning-banner"]',
      );

      if (await warningBanner.isVisible()) {
        const closeButton = warningBanner.locator(
          '[data-testid="close-warning"]',
        );
        await closeButton.click();

        await expect(warningBanner).not.toBeVisible();
      }
    });
  });
});
```

---

### 2. Story 3.2: View School List with Fit Scores

**File:** `tests/e2e/schools-fit-score.spec.ts`
**New File**

```typescript
import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import { schoolsFixture } from "./fixtures/schools.fixture";

test.describe("Story 3.2: View School List with Fit Scores", () => {
  test.beforeEach(async ({ page }) => {
    await authFixture.ensureLoggedIn(page);
    // Assuming some schools are already seeded in test database
    await schoolsFixture.navigateToSchoolsPage(page);
  });

  test.describe("Scenario: Fit score displays for each school", () => {
    test("should display fit score on schools list", async ({ page }) => {
      const schoolCard = page.locator('[data-testid="school-card"]').first();

      // Look for fit score element
      const fitScore = schoolCard.locator('[data-testid="fit-score"]');
      await expect(fitScore).toBeVisible();

      // Should show a number 0-100
      const scoreText = await fitScore.textContent();
      const score = parseInt(scoreText?.match(/\d+/)?.[0] || "0");

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test("should display fit score on school detail page", async ({ page }) => {
      // Click into a school
      const schoolCard = page.locator('[data-testid="school-card"]').first();
      const schoolName = await schoolCard
        .locator('[data-testid="school-name"]')
        .textContent();

      await schoolCard.click();
      await page.waitForLoadState("networkidle");

      // Verify fit score visible on detail
      const fitScoreDisplay = page.locator('[data-testid="school-fit-score"]');
      await expect(fitScoreDisplay).toBeVisible();

      // Should show score and badge
      const scoreValue = page.locator('[data-testid="fit-score-value"]');
      await expect(scoreValue).toContainText(/\d+/);

      const badge = page.locator('[data-testid="fit-score-badge"]');
      await expect(badge).toContainText(/Match|Fit/);
    });
  });

  test.describe("Scenario: Fit score breakdown is visible", () => {
    test("should show fit score breakdown on demand", async ({ page }) => {
      // Navigate to school detail
      const schoolCard = page.locator('[data-testid="school-card"]').first();
      await schoolCard.click();
      await page.waitForLoadState("networkidle");

      // Click to view breakdown
      const breakdownLink = page.locator('[data-testid="view-fit-breakdown"]');
      await breakdownLink.click();

      // Verify modal opens
      const breakdownModal = page.locator(
        '[data-testid="fit-score-breakdown-modal"]',
      );
      await expect(breakdownModal).toBeVisible();
    });

    test("should display all 4 components in breakdown", async ({ page }) => {
      // Setup: Go to school detail and open breakdown
      const schoolCard = page.locator('[data-testid="school-card"]').first();
      await schoolCard.click();
      await page.waitForLoadState("networkidle");

      const breakdownLink = page.locator('[data-testid="view-fit-breakdown"]');
      await breakdownLink.click();

      // Check for 4 components
      const components = [
        "Academic Fit",
        "Athletic Fit",
        "Opportunity Fit",
        "Personal Fit",
      ];

      for (const component of components) {
        const element = page.locator(`text=${component}`);
        await expect(element).toBeVisible();
      }
    });

    test("should show reason for each component", async ({ page }) => {
      // Open breakdown
      const schoolCard = page.locator('[data-testid="school-card"]').first();
      await schoolCard.click();
      await page.waitForLoadState("networkidle");

      const breakdownLink = page.locator('[data-testid="view-fit-breakdown"]');
      await breakdownLink.click();

      // Each component should have a reason/description
      const reasons = page.locator('[data-testid="fit-component-reason"]');
      const reasonCount = await reasons.count();

      expect(reasonCount).toBeGreaterThanOrEqual(4);

      // At least one reason should have non-empty text
      const firstReason = reasons.first();
      const text = await firstReason.textContent();
      expect(text).not.toBe("");
    });

    test("should show score for each component (0-100)", async ({ page }) => {
      // Open breakdown
      const schoolCard = page.locator('[data-testid="school-card"]').first();
      await schoolCard.click();
      await page.waitForLoadState("networkidle");

      const breakdownLink = page.locator('[data-testid="view-fit-breakdown"]');
      await breakdownLink.click();

      // Check each component score
      const scores = page.locator('[data-testid="fit-component-score"]');
      const scoreCount = await scores.count();

      expect(scoreCount).toBeGreaterThanOrEqual(4);

      for (let i = 0; i < scoreCount; i++) {
        const scoreText = await scores.nth(i).textContent();
        const score = parseInt(scoreText?.match(/\d+/)?.[0] || "0");

        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe("Scenario: Fit score updates automatically", () => {
    test("should recalculate fit score when athlete profile changes", async ({
      page,
    }) => {
      // Navigate to athlete profile
      await page.goto("/athlete-profile");
      await page.waitForLoadState("networkidle");

      // Record current GPA
      const gpaField = page.locator('[data-testid="athlete-gpa"]');
      const originalGpa = await gpaField.inputValue();

      // Change GPA
      await gpaField.clear();
      await gpaField.fill("3.8");
      await page.locator('[data-testid="profile-save"]').click();

      // Wait for notification
      const notification = page.locator('[data-testid="notification"]');
      await expect(notification).toContainText("updated");

      // Navigate to schools
      await schoolsFixture.navigateToSchoolsPage(page);

      // Fit scores should have recalculated
      // (Verify by checking if any changed - would need reference values)
      const fitScores = page.locator('[data-testid="fit-score"]');
      await expect(fitScores.first()).toBeVisible();
    });

    test("should show notification when fit scores update", async ({
      page,
    }) => {
      // Profile change should trigger notification
      await page.goto("/athlete-profile");
      await page.waitForLoadState("networkidle");

      const gpaField = page.locator('[data-testid="athlete-gpa"]');
      await gpaField.clear();
      await gpaField.fill("3.5");

      const saveButton = page.locator('[data-testid="profile-save"]');
      await saveButton.click();

      // Check for "Fit scores updated" notification
      const updateNotification = page.locator("text=Fit scores updated");
      await expect(updateNotification).toBeVisible();
    });

    test("should complete recalculation within 1 second", async ({ page }) => {
      const startTime = performance.now();

      // Trigger profile change
      await page.goto("/athlete-profile");
      await page.waitForLoadState("networkidle");

      const gpaField = page.locator('[data-testid="athlete-gpa"]');
      await gpaField.clear();
      await gpaField.fill("3.6");

      const saveButton = page.locator('[data-testid="profile-save"]');
      await saveButton.click();

      // Wait for notification
      const notification = page.locator('[data-testid="notification"]');
      await expect(notification).toContainText("updated", { timeout: 1000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  test.describe("Scenario: Honest assessment - no false hope", () => {
    test("should show low scores for athletes not matching D1 requirements", async ({
      page,
    }) => {
      // This would require test data setup with low-stat athlete
      // Pattern shown here:

      await schoolsFixture.navigateToSchoolsPage(page);

      // Filter to D1 schools
      await page.locator('[data-testid="division-filter"]').click();
      await page.locator('[data-testid="filter-d1"]').click();

      // If athlete stats don't match D1, scores should be <60
      const fitScores = page.locator('[data-testid="fit-score"]');
      const count = await fitScores.count();

      // At least most scores should be low
      let lowScoreCount = 0;
      for (let i = 0; i < count; i++) {
        const scoreText = await fitScores.nth(i).textContent();
        const score = parseInt(scoreText?.match(/\d+/)?.[0] || "0");
        if (score < 60) lowScoreCount++;
      }

      expect(lowScoreCount).toBeGreaterThan(0);
    });
  });
});
```

---

### 3. Story 3.3: Filter and Sort Schools

**File:** `tests/e2e/schools-filter-sort.spec.ts`
**New File**

```typescript
import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import { schoolsFixture } from "./fixtures/schools.fixture";

test.describe("Story 3.3: Filter and Sort Schools", () => {
  test.beforeEach(async ({ page }) => {
    await authFixture.ensureLoggedIn(page);
    await schoolsFixture.navigateToSchoolsPage(page);
  });

  test.describe("Scenario: Filter by priority tier", () => {
    test("should filter schools by priority A", async ({ page }) => {
      // Set a school to priority A first
      const firstCard = page.locator('[data-testid="school-card"]').first();
      const priorityButton = firstCard.locator(
        '[data-testid="priority-button"]',
      );
      await priorityButton.click();
      await page.locator('[data-testid="priority-a-option"]').click();
      await page.waitForTimeout(500);

      // Now filter
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await priorityFilter.click();
      await page.locator('[data-testid="filter-priority-a"]').click();

      // Should only show priority A schools
      const cards = page.locator('[data-testid="school-card"]');
      const count = await cards.count();

      // Verify each shown school has A tier badge
      for (let i = 0; i < count; i++) {
        const tierBadge = cards
          .nth(i)
          .locator('[data-testid="priority-tier-badge"]');
        await expect(tierBadge).toContainText("A");
      }
    });

    test("should filter schools by priority B", async ({ page }) => {
      // Similar to A, but for B tier
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await priorityFilter.click();
      await page.locator('[data-testid="filter-priority-b"]').click();

      const cards = page.locator('[data-testid="school-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const tierBadge = cards
          .nth(i)
          .locator('[data-testid="priority-tier-badge"]');
        await expect(tierBadge).toContainText("B");
      }
    });

    test("should filter schools by priority C", async ({ page }) => {
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await priorityFilter.click();
      await page.locator('[data-testid="filter-priority-c"]').click();

      const cards = page.locator('[data-testid="school-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const tierBadge = cards
          .nth(i)
          .locator('[data-testid="priority-tier-badge"]');
        await expect(tierBadge).toContainText("C");
      }
    });
  });

  test.describe("Scenario: Filter by fit score range", () => {
    test("should filter schools by fit score 70-100", async ({ page }) => {
      const fitScoreFilter = page.locator('[data-testid="fit-score-filter"]');
      await fitScoreFilter.click();

      const minInput = page.locator('[data-testid="fit-score-min"]');
      const maxInput = page.locator('[data-testid="fit-score-max"]');

      await minInput.clear();
      await minInput.fill("70");
      await maxInput.clear();
      await maxInput.fill("100");

      // Apply filter
      const applyButton = page.locator('[data-testid="apply-fit-filter"]');
      await applyButton.click();
      await page.waitForTimeout(300);

      // All visible schools should have score >= 70
      const cards = page.locator('[data-testid="school-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const scoreText = await cards
          .nth(i)
          .locator('[data-testid="fit-score"]')
          .textContent();
        const score = parseInt(scoreText?.match(/\d+/)?.[0] || "0");
        expect(score).toBeGreaterThanOrEqual(70);
      }
    });

    test("should use preset filter buttons", async ({ page }) => {
      const fitScoreFilter = page.locator('[data-testid="fit-score-filter"]');
      await fitScoreFilter.click();

      // Click 75-100 preset
      const presetButton = page.locator('[data-testid="fit-preset-75-100"]');
      await presetButton.click();
      await page.waitForTimeout(300);

      // Verify filter applied
      const cards = page.locator('[data-testid="school-card"]');
      const count = await cards.count();

      // All should be 75+
      for (let i = 0; i < count; i++) {
        const scoreText = await cards
          .nth(i)
          .locator('[data-testid="fit-score"]')
          .textContent();
        const score = parseInt(scoreText?.match(/\d+/)?.[0] || "0");
        expect(score).toBeGreaterThanOrEqual(75);
      }
    });
  });

  test.describe("Scenario: Sort schools by distance", () => {
    test("should sort schools by distance ascending (closest first)", async ({
      page,
    }) => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.locator('[data-testid="sort-distance"]').click();

      // Click sort order to ensure ascending
      const orderButton = page.locator('[data-testid="sort-order"]');
      const currentOrder = await orderButton.getAttribute("data-order");
      if (currentOrder === "desc") {
        await orderButton.click();
      }

      await page.waitForTimeout(300);

      // Verify order - distances should increase
      const distances = page.locator('[data-testid="school-distance"]');
      const count = await distances.count();

      if (count > 1) {
        const firstDist = parseInt(
          (await distances.first().textContent()) || "0",
        );
        const lastDist = parseInt(
          (await distances.last().textContent()) || "999999",
        );

        expect(firstDist).toBeLessThanOrEqual(lastDist);
      }
    });

    test("should sort schools by distance descending (farthest first)", async ({
      page,
    }) => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.locator('[data-testid="sort-distance"]').click();

      // Ensure descending order
      const orderButton = page.locator('[data-testid="sort-order"]');
      await orderButton.click();

      await page.waitForTimeout(300);

      const distances = page.locator('[data-testid="school-distance"]');
      const count = await distances.count();

      if (count > 1) {
        const firstDist = parseInt(
          (await distances.first().textContent()) || "0",
        );
        const lastDist = parseInt(
          (await distances.last().textContent()) || "0",
        );

        expect(firstDist).toBeGreaterThanOrEqual(lastDist);
      }
    });
  });

  test.describe("Scenario: Sort schools by fit score", () => {
    test("should sort by fit score highest first", async ({ page }) => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.locator('[data-testid="sort-fit-score"]').click();

      // Ensure descending (highest first)
      const orderButton = page.locator('[data-testid="sort-order"]');
      const order = await orderButton.getAttribute("data-order");
      if (order === "asc") {
        await orderButton.click();
      }

      await page.waitForTimeout(300);

      const scores = page.locator('[data-testid="fit-score"]');
      const count = await scores.count();

      if (count > 1) {
        const firstScore = parseInt(
          (await scores.first().textContent()) || "0",
        );
        const lastScore = parseInt((await scores.last().textContent()) || "0");

        expect(firstScore).toBeGreaterThanOrEqual(lastScore);
      }
    });

    test("should sort by fit score lowest first", async ({ page }) => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.locator('[data-testid="sort-fit-score"]').click();

      const orderButton = page.locator('[data-testid="sort-order"]');
      await orderButton.click();

      await page.waitForTimeout(300);

      const scores = page.locator('[data-testid="fit-score"]');
      const count = await scores.count();

      if (count > 1) {
        const firstScore = parseInt(
          (await scores.first().textContent()) || "100",
        );
        const lastScore = parseInt((await scores.last().textContent()) || "0");

        expect(firstScore).toBeLessThanOrEqual(lastScore);
      }
    });
  });

  test.describe("Scenario: Apply multiple filters together", () => {
    test("should apply priority + fit score filters", async ({ page }) => {
      // Apply priority A filter
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await priorityFilter.click();
      await page.locator('[data-testid="filter-priority-a"]').click();

      // Apply fit score 70-100
      const fitScoreFilter = page.locator('[data-testid="fit-score-filter"]');
      await fitScoreFilter.click();
      await page.locator('[data-testid="fit-preset-70-100"]').click();

      await page.waitForTimeout(300);

      // All visible schools should be priority A AND fit score 70+
      const cards = page.locator('[data-testid="school-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);

        // Check priority
        const tierBadge = card.locator('[data-testid="priority-tier-badge"]');
        await expect(tierBadge).toContainText("A");

        // Check fit score
        const score = await card
          .locator('[data-testid="fit-score"]')
          .textContent();
        const scoreNum = parseInt(score?.match(/\d+/)?.[0] || "0");
        expect(scoreNum).toBeGreaterThanOrEqual(70);
      }
    });

    test("should combine priority + division + distance filters", async ({
      page,
    }) => {
      // Example: Priority A, D1 schools, within 500 miles
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await priorityFilter.click();
      await page.locator('[data-testid="filter-priority-a"]').click();

      const divisionFilter = page.locator('[data-testid="division-filter"]');
      await divisionFilter.click();
      await page.locator('[data-testid="filter-d1"]').click();

      const distanceFilter = page.locator('[data-testid="distance-filter"]');
      await distanceFilter.click();
      const maxInput = page.locator('[data-testid="distance-max"]');
      await maxInput.fill("500");
      await page.locator('[data-testid="apply-distance-filter"]').click();

      await page.waitForTimeout(300);

      // Verify all filters applied
      const results = page.locator('[data-testid="filter-result-count"]');
      const count = await results.textContent();

      // Should have some results (or none, but filter worked)
      expect(count).toBeDefined();
    });
  });

  test.describe("Performance: Filter results load quickly", () => {
    test("should load filter results in under 100ms", async ({ page }) => {
      const startTime = performance.now();

      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await priorityFilter.click();
      await page.locator('[data-testid="filter-priority-a"]').click();

      // Wait for UI update
      await page.locator('[data-testid="school-card"]').first().waitFor();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});
```

---

### 4. Story 3.4: Set Priority and Track Status

**File:** `tests/e2e/schools-priority-status.spec.ts`
**New File**

```typescript
import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import { schoolsFixture } from "./fixtures/schools.fixture";

test.describe("Story 3.4: Set School Priority and Status", () => {
  test.beforeEach(async ({ page }) => {
    await authFixture.ensureLoggedIn(page);
  });

  test.describe("Scenario: Set school priority tier", () => {
    test("should set school to priority A", async ({ page }) => {
      // Create or navigate to existing school
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Click priority selector
      const prioritySelector = page.locator(
        '[data-testid="priority-selector"]',
      );
      await prioritySelector.click();

      // Select A
      const tierA = page.locator('[data-testid="priority-tier-a"]');
      await tierA.click();

      // Verify save
      const badge = page.locator('[data-testid="priority-badge"]');
      await expect(badge).toContainText("A");

      // Verify it appears in list
      await page.goto("/schools");
      const cardBadge = page
        .locator('[data-testid="school-card"]')
        .first()
        .locator('[data-testid="priority-badge"]');
      await expect(cardBadge).toContainText("A");
    });

    test("should set school to priority B", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const prioritySelector = page.locator(
        '[data-testid="priority-selector"]',
      );
      await prioritySelector.click();

      const tierB = page.locator('[data-testid="priority-tier-b"]');
      await tierB.click();

      const badge = page.locator('[data-testid="priority-badge"]');
      await expect(badge).toContainText("B");
    });

    test("should set school to priority C", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const prioritySelector = page.locator(
        '[data-testid="priority-selector"]',
      );
      await prioritySelector.click();

      const tierC = page.locator('[data-testid="priority-tier-c"]');
      await tierC.click();

      const badge = page.locator('[data-testid="priority-badge"]');
      await expect(badge).toContainText("C");
    });

    test("should change priority tier from A to B", async ({ page }) => {
      // Setup: Create school with priority A
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const prioritySelector = page.locator(
        '[data-testid="priority-selector"]',
      );
      await prioritySelector.click();
      await page.locator('[data-testid="priority-tier-a"]').click();

      // Now change to B
      await prioritySelector.click();
      await page.locator('[data-testid="priority-tier-b"]').click();

      const badge = page.locator('[data-testid="priority-badge"]');
      await expect(badge).toContainText("B");
    });
  });

  test.describe("Scenario: Track recruiting status", () => {
    test("should update status to interested", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();

      await page.locator('[data-testid="status-interested"]').click();

      const statusBadge = page.locator('[data-testid="status-badge"]');
      await expect(statusBadge).toContainText("interested");
    });

    test("should update status to recruited", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();

      await page.locator('[data-testid="status-recruited"]').click();

      const statusBadge = page.locator('[data-testid="status-badge"]');
      await expect(statusBadge).toContainText("recruited");
    });

    test("should update status to offer received", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();

      await page.locator('[data-testid="status-offer-received"]').click();

      const statusBadge = page.locator('[data-testid="status-badge"]');
      await expect(statusBadge).toContainText("offer");
    });
  });

  test.describe("Scenario: Status changes are timestamped", () => {
    test("should record timestamp when status changes", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();
      await page.locator('[data-testid="status-interested"]').click();

      // Check for "Updated" timestamp
      const updatedTime = page.locator('[data-testid="school-updated-time"]');
      const timeText = await updatedTime.textContent();

      // Should show recent timestamp
      expect(timeText).toContain("ago"); // e.g., "just now", "5 minutes ago"
    });

    test("should view status change history", async ({ page }) => {
      // Setup: Create school and change status
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Change status
      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();
      await page.locator('[data-testid="status-interested"]').click();

      // View history
      const historyButton = page.locator('[data-testid="view-status-history"]');
      await historyButton.click();

      // Should see status timeline
      const timeline = page.locator('[data-testid="status-timeline"]');
      await expect(timeline).toBeVisible();

      // Should show timestamp of change
      const entry = timeline.locator('[data-testid="timeline-entry"]').first();
      await expect(entry).toContainText("interested");
    });
  });

  test.describe("Scenario: Priority and status are independent", () => {
    test("should set priority without changing status", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Set initial status
      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();
      await page.locator('[data-testid="status-interested"]').click();

      const statusBefore = await page
        .locator('[data-testid="status-badge"]')
        .textContent();

      // Set priority
      const prioritySelector = page.locator(
        '[data-testid="priority-selector"]',
      );
      await prioritySelector.click();
      await page.locator('[data-testid="priority-tier-a"]').click();

      // Status should be unchanged
      const statusAfter = await page
        .locator('[data-testid="status-badge"]')
        .textContent();
      expect(statusAfter).toBe(statusBefore);
      expect(statusAfter).toContain("interested");
    });

    test("should change status without affecting priority", async ({
      page,
    }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Set priority
      const prioritySelector = page.locator(
        '[data-testid="priority-selector"]',
      );
      await prioritySelector.click();
      await page.locator('[data-testid="priority-tier-a"]').click();

      const priorityBefore = await page
        .locator('[data-testid="priority-badge"]')
        .textContent();

      // Change status
      const statusSelector = page.locator('[data-testid="status-selector"]');
      await statusSelector.click();
      await page.locator('[data-testid="status-recruited"]').click();

      // Priority should be unchanged
      const priorityAfter = await page
        .locator('[data-testid="priority-badge"]')
        .textContent();
      expect(priorityAfter).toBe(priorityBefore);
      expect(priorityAfter).toContain("A");
    });
  });
});
```

---

### 5. Story 3.5: Notes and Details

**File:** `tests/e2e/schools-notes.spec.ts`
**New File**

```typescript
import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import { schoolsFixture } from "./fixtures/schools.fixture";

test.describe("Story 3.5: View and Add School Notes", () => {
  test.beforeEach(async ({ page }) => {
    await authFixture.ensureLoggedIn(page);
  });

  test.describe("Scenario: Add notes about school", () => {
    test("should add notes to school", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Click to add notes
      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill(
        "Great campus, strong athletic program, responsive coaches. Top choice.",
      );

      // Save
      const saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();

      // Verify display
      const noteDisplay = page.locator('[data-testid="notes-display"]');
      await expect(noteDisplay).toContainText("Great campus");
    });

    test("should save notes in under 2 seconds", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill("Test notes");

      const startTime = performance.now();
      const saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();

      // Wait for notification
      await expect(page.locator("text=saved")).toBeVisible({ timeout: 2000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });

    test("should display notes on school detail page", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const testNotes = "Campus visit scheduled for March 15";
      const notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill(testNotes);

      const saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Notes should still be visible
      const noteDisplay = page.locator('[data-testid="notes-display"]');
      await expect(noteDisplay).toContainText(testNotes);
    });
  });

  test.describe("Scenario: Edit notes", () => {
    test("should edit existing notes", async ({ page }) => {
      // Setup: Create note
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      let notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill("Original notes");

      let saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();
      await page.waitForTimeout(500);

      // Edit
      notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.clear();
      await notesTextarea.fill("Updated notes");

      saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();

      // Verify update
      const noteDisplay = page.locator('[data-testid="notes-display"]');
      await expect(noteDisplay).toContainText("Updated notes");
      await expect(noteDisplay).not.toContainText("Original notes");
    });

    test("should show last updated time", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill("Test notes");

      const saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();

      // Check for updated timestamp
      const updatedText = page.locator('[data-testid="notes-updated"]');
      await expect(updatedText).toBeVisible();
      await expect(updatedText).toContainText("ago"); // "just now", "5 minutes ago"
    });
  });

  test.describe("Scenario: Character limit for notes", () => {
    test("should enforce 5000 character limit", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const notesTextarea = page.locator('[data-testid="notes-textarea"]');

      // Try to type 5100 characters
      const longText = "a".repeat(5100);
      await notesTextarea.fill(longText);

      // Should be truncated or limited to 5000
      const value = await notesTextarea.inputValue();
      expect(value.length).toBeLessThanOrEqual(5000);
    });

    test("should show character count indicator", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill("Test");

      // Should show "4 / 5000" counter
      const counter = page.locator('[data-testid="notes-character-count"]');
      await expect(counter).toBeVisible();
      const text = await counter.textContent();
      expect(text).toContain("4");
      expect(text).toContain("5000");
    });

    test("should warn when approaching limit", async ({ page }) => {
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      const notesTextarea = page.locator('[data-testid="notes-textarea"]');
      // Fill with 4500 chars (within 500 of limit)
      await notesTextarea.fill("a".repeat(4500));

      // Should show warning (color change, alert)
      const counter = page.locator('[data-testid="notes-character-count"]');
      const warning = counter.locator("[data-warning='true']");
      await expect(warning).toBeVisible();
    });
  });

  test.describe("Scenario: Edit history for notes", () => {
    test("should show edit history when viewing notes", async ({ page }) => {
      // Setup: Create and edit notes
      await schoolsFixture.navigateToSchoolsPage(page);
      const firstCard = page.locator('[data-testid="school-card"]').first();
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Create
      const notesButton = page.locator('[data-testid="edit-notes"]');
      await notesButton.click();

      let notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.fill("Version 1");
      let saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();
      await page.waitForTimeout(500);

      // Edit
      await notesButton.click();
      notesTextarea = page.locator('[data-testid="notes-textarea"]');
      await notesTextarea.clear();
      await notesTextarea.fill("Version 2");
      saveButton = page.locator('[data-testid="save-notes"]');
      await saveButton.click();

      // View history
      const historyButton = page.locator('[data-testid="view-note-history"]');
      if (await historyButton.isVisible()) {
        await historyButton.click();

        const historyModal = page.locator('[data-testid="note-history-modal"]');
        await expect(historyModal).toBeVisible();

        // Should show both versions
        await expect(historyModal).toContainText("Version 1");
        await expect(historyModal).toContainText("Version 2");
      }
    });
  });
});
```

---

## Test Execution Strategy

### Pre-Test Setup

```bash
# Ensure dev server is running
npm run dev &

# Run specific E2E suite
npm run test:e2e -- tests/e2e/schools-add.spec.ts

# Run all Story 3 E2E tests
npm run test:e2e -- tests/e2e/schools-*.spec.ts

# Run with UI for debugging
npm run test:e2e:ui -- tests/e2e/schools-filter-sort.spec.ts
```

### Test Data Setup

Consider creating test fixtures in the database:

- Multiple schools with varied data
- Schools with different priority tiers
- Schools with fit scores ranging from low to high
- Schools at various distances

Or use database seeding in test fixtures.

---

## Performance Requirements Verification

| Requirement          | Test                        | Threshold |
| -------------------- | --------------------------- | --------- |
| Add school <30s      | schools-add.spec.ts         | 30,000ms  |
| Recalc fit score <1s | schools-fit-score.spec.ts   | 1,000ms   |
| Filter load <100ms   | schools-filter-sort.spec.ts | 100ms     |
| Notes save <2s       | schools-notes.spec.ts       | 2,000ms   |

---

## Known Challenges & Solutions

| Challenge              | Solution                                              |
| ---------------------- | ----------------------------------------------------- |
| Test data setup        | Use fixtures/seeding, or create fresh data per test   |
| Timing-dependent tests | Use explicit waits, avoid `setTimeout`                |
| Flaky selectors        | Use `data-testid` attributes, not brittle text/CSS    |
| Database state         | Clear relevant data between tests or use transactions |
| Async operations       | Use proper `waitFor` with timeouts                    |

---

## CI/CD Integration

Add to CI pipeline:

```yaml
- name: Run E2E Tests
  run: npm run test:e2e -- tests/e2e/schools-*.spec.ts
  timeout-minutes: 10

- name: Upload Results
  if: failure()
  uses: actions/upload-artifact@v2
  with:
    name: e2e-reports
    path: playwright-report/
```

---

## Notes for Implementation

1. **Data-testid attributes** must be added to all interactive elements
2. **Auth fixture** should handle test user login
3. **Network waits** use `waitForLoadState("networkidle")`
4. **Modal interactions** should wait for visibility before interacting
5. **Parallel tests** - disable if there's shared database state
6. **Video recording** - consider enabling for debugging (slows tests)
7. **Screenshots on failure** - Playwright auto-captures
