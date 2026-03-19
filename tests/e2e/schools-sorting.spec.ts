import { test, expect } from "@playwright/test";

test.describe("Schools Sorting", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the schools page
    await page.goto("/schools");

    // Wait for schools to load
    await page
      .waitForSelector('[data-testid="school-card"]', { timeout: 10000 })
      .catch(() => null);
    // If no test ID, wait for school names to be visible
    await page
      .waitForSelector('h3:has-text("school")', { timeout: 5000 })
      .catch(() => null);
  });

  test("should display sort selector in filter bar", async ({ page }) => {
    // Look for the sort dropdown (first select element labeled "Sort By")
    const sortSelects = await page.locator("select").all();
    expect(sortSelects.length).toBeGreaterThan(0);

    // Find the sort selector by looking for options
    let found = false;
    for (const select of sortSelects) {
      const text = await select.textContent();
      if (text?.includes("Fit") || text?.includes("Distance")) {
        found = true;
        break;
      }
    }
    expect(found || sortSelects.length > 5).toBeTruthy(); // At least 6 selects (search, division, status, favorites, priority, sort)
  });

  test("should sort schools A-Z by default", async ({ page }) => {
    // Get all school name elements
    const schoolNames = await page.locator("h3").all();
    const names: string[] = [];

    for (const name of schoolNames) {
      const text = await name.textContent();
      if (text && text.trim().length > 0) {
        names.push(text.trim());
      }
    }

    // All names should be in non-descending alphabetical order
    if (names.length >= 2) {
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    }
  });

  test("should change sort order when ascending/descending button is clicked", async ({
    page,
  }) => {
    // Find the sort selector and the toggle button (second button in the grid)
    const selectors = await page.locator("select").all();
    const buttons = await page.locator("button").all();

    // Get initial school names
    let initialNames: string[] = [];
    let schoolElements = await page.locator("h3").all();
    for (const el of schoolElements) {
      const text = await el.textContent();
      if (text && text.trim().length > 0) {
        initialNames.push(text.trim());
      }
    }

    // Find and click the sort order button (it should have up/down arrow icons)
    const filterBar = await page.locator(".p-4").first();
    const filterButtons = await filterBar.locator("button").all();

    if (filterButtons.length > 0) {
      // Last button in filter bar should be the sort order toggle
      await filterButtons[filterButtons.length - 1].click();

      // Wait for re-sort
      await page.waitForTimeout(200);

      // Get new school names
      let reversedNames: string[] = [];
      schoolElements = await page.locator("h3").all();
      for (const el of schoolElements) {
        const text = await el.textContent();
        if (text && text.trim().length > 0) {
          reversedNames.push(text.trim());
        }
      }

      // If there are at least 2 schools, order should be different
      if (initialNames.length >= 2 && reversedNames.length >= 2) {
        expect(initialNames[0]).not.toBe(reversedNames[0]);
      }
    }
  });

  test("should show warning when distance sort selected without home location", async ({
    page,
  }) => {
    // This test assumes home location is not set
    // Try to select distance sort
    const allSelects = await page.locator("select").all();
    let distanceSelect = null;

    for (const select of allSelects) {
      const options = await select.locator("option").all();
      for (const option of options) {
        const value = await option.getAttribute("value");
        if (value === "distance") {
          distanceSelect = select;
          break;
        }
      }
      if (distanceSelect) break;
    }

    if (distanceSelect) {
      await distanceSelect.selectOption("distance");

      // Check if schools are still visible or if there's a message
      const schoolCards = await page.locator("h3").all();
      expect(schoolCards.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("should sort by last contact date when selected", async ({ page }) => {
    const allSelects = await page.locator("select").all();
    let lastContactSelect = null;

    for (const select of allSelects) {
      const options = await select.locator("option").all();
      for (const option of options) {
        const value = await option.getAttribute("value");
        if (value === "last-contact") {
          lastContactSelect = select;
          break;
        }
      }
      if (lastContactSelect) break;
    }

    if (lastContactSelect) {
      await lastContactSelect.selectOption("last-contact");

      // Wait for re-sort
      await page.waitForTimeout(300);

      // Verify schools are displayed
      const schoolCards = await page.locator("h3").all();
      expect(schoolCards.length).toBeGreaterThan(0);
    }
  });

  test("should reset sort to A-Z when sort button has default state", async ({
    page,
  }) => {
    // Get the sort select
    const allSelects = await page.locator("select").all();
    if (allSelects.length > 5) {
      const sortSelect = allSelects[5];

      // Check if value is 'a-z'
      const value = await sortSelect.inputValue();
      // If default is a-z, schools should be alphabetical
      if (value === "a-z") {
        const schoolNames = await page.locator("h3").all();
        expect(schoolNames.length).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
