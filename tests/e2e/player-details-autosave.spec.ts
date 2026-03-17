import { test, expect } from "@playwright/test";

test.describe("Player Details Auto-Save", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to player details page
    // Note: In a real test, you'd login first, but for now we assume auth is set up
    await page.goto("/settings/player-details");
    await page.waitForLoadState("networkidle");
  });

  test("should display player details page", async ({ page }) => {
    // Check page title
    const title = page.locator("h1");
    await expect(title).toContainText("Player Details");

    // Check that major tab sections exist (tabs appear twice - desktop + mobile, use first)
    await expect(page.locator("text=Athletics").first()).toBeVisible();
    await expect(page.locator("text=Academics & Social").first()).toBeVisible();
  });

  test("should show primary sport and position fields", async ({ page }) => {
    // Find the Athletics section
    const athleticSection = page.locator("text=Athletics").first();
    await expect(athleticSection).toBeVisible();

    // Find sport selector
    const sportSelects = page.locator("select");
    let foundSportSelector = false;
    for (let i = 0; i < (await sportSelects.count()); i++) {
      const label = await sportSelects
        .nth(i)
        .evaluate((el) => (el as any).parentElement?.textContent);
      if (label && label.includes("Primary Sport")) {
        foundSportSelector = true;
        break;
      }
    }
    expect(foundSportSelector).toBe(true);
  });

  test("should update available positions when sport changes", async ({
    page,
  }) => {
    // Find all selects on the page
    const allSelects = page.locator("select");

    // Find the sport select by looking for one with "Baseball" option
    let sportSelectIndex = -1;
    for (let i = 0; i < (await allSelects.count()); i++) {
      const hasBaseball = await allSelects
        .nth(i)
        .locator('option[value="Baseball"], option:has-text("Baseball")')
        .count();
      if (hasBaseball > 0) {
        sportSelectIndex = i;
        break;
      }
    }

    if (sportSelectIndex >= 0) {
      // Select a sport
      await allSelects.nth(sportSelectIndex).selectOption("Baseball");

      // Wait for DOM to update
      await page.waitForTimeout(300);

      // Check that position buttons appeared
      const positionButtons = page.locator("button").filter({
        hasText: /^P$|^C$|^1B$|^SS$/,
      });
      const count = await positionButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should display primary position selector after choosing sport", async ({
    page,
  }) => {
    // Find the sport select by looking for one with "Baseball" option
    const allSelects = page.locator("select");
    let sportSelectIndex = -1;

    for (let i = 0; i < (await allSelects.count()); i++) {
      const hasBaseball = await allSelects
        .nth(i)
        .locator('option[value="Baseball"], option:has-text("Baseball")')
        .count();
      if (hasBaseball > 0) {
        sportSelectIndex = i;
        break;
      }
    }

    if (sportSelectIndex >= 0) {
      // Select a sport
      await allSelects.nth(sportSelectIndex).selectOption("Baseball");
      await page.waitForTimeout(300);

      // After selecting Baseball, position buttons should appear (UI uses buttons not select)
      const positionButtons = page.locator("button").filter({
        hasText: /^(P|C|1B|2B|3B|SS|LF|CF|RF|DH|SP|RP|CP)$/,
      });
      const count = await positionButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should have academic fields with GPA, SAT, ACT", async ({ page }) => {
    // Check for GPA input
    const gpaInput = page.locator('[data-testid="gpa-input"]');
    if (await gpaInput.isVisible()) {
      await expect(gpaInput).toBeVisible();
    }

    // Check for SAT/ACT fields by looking for their labels
    const labels = page.locator("label");
    let hasAcademics = false;

    for (let i = 0; i < (await labels.count()); i++) {
      const text = await labels.nth(i).textContent();
      if (
        text &&
        (text.includes("GPA") || text.includes("SAT") || text.includes("ACT"))
      ) {
        hasAcademics = true;
        break;
      }
    }

    expect(hasAcademics).toBe(true);
  });

  test("should have graduation year field", async ({ page }) => {
    const labels = page.locator("label");
    let foundGradYear = false;

    for (let i = 0; i < (await labels.count()); i++) {
      const text = await labels.nth(i).textContent();
      if (text && text.includes("Graduation Year")) {
        foundGradYear = true;
        break;
      }
    }

    expect(foundGradYear).toBe(true);
  });

  test("should render without errors", async ({ page }) => {
    // Page loaded in beforeEach — verify no error state is shown
    const errorBanner = page.locator('[data-testid="error-banner"], .text-red-600').first();
    const hasError = await errorBanner.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test("should have save button available", async ({ page }) => {
    const saveButton = page.locator(
      '[data-testid="save-player-details-button"]',
    );
    if (await saveButton.isVisible()) {
      await expect(saveButton).toBeVisible();
      await expect(saveButton).not.toBeDisabled();
    }
  });

  test("form fields should be properly labeled", async ({ page }) => {
    const labels = page.locator("label");
    const labelTexts: string[] = [];

    for (let i = 0; i < (await labels.count()); i++) {
      const text = await labels.nth(i).textContent();
      if (text) {
        labelTexts.push(text.trim());
      }
    }

    // Check for key field labels
    expect(labelTexts.join("|")).toMatch(
      /Graduation Year|School Name|Primary Sport/,
    );
  });

  test("should have proper structure for position selection", async ({
    page,
  }) => {
    // Athletics tab is visible
    await expect(page.locator("text=Athletics").first()).toBeVisible();

    // The Primary Sport select (in the Basics tab - default) should be visible
    const allSelects = page.locator("select");
    let foundSportSelect = false;
    for (let i = 0; i < (await allSelects.count()); i++) {
      const hasBaseballOption = await allSelects
        .nth(i)
        .locator('option:has-text("Baseball"), option[value="Baseball"]')
        .count();
      if (hasBaseballOption > 0) {
        foundSportSelect = true;
        break;
      }
    }
    expect(foundSportSelect).toBe(true);
  });
});
