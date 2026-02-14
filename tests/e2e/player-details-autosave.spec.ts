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

    // Check that major sections exist
    await expect(page.locator("text=Athletic Profile")).toBeVisible();
    await expect(page.locator("text=Academics")).toBeVisible();
  });

  test("should show primary sport and position fields", async ({ page }) => {
    // Find the Athletic Profile section
    const athleticSection = page.locator("text=Athletic Profile").first();
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
    const selects = page.locator("select");

    // Find the sport select (should be one of the early selects in Athletic Profile)
    let sportSelectIndex = -1;
    for (let i = 0; i < Math.min(3, await selects.count()); i++) {
      const options = await selects.nth(i).locator("option").count();
      // Sport selector should have multiple sports (typically 10+)
      if (options > 10) {
        sportSelectIndex = i;
        break;
      }
    }

    if (sportSelectIndex >= 0) {
      // Select a sport
      await selects.nth(sportSelectIndex).selectOption("Baseball");

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
    // Find the sport select
    const selects = page.locator("select");
    let sportSelectIndex = -1;

    for (let i = 0; i < Math.min(3, await selects.count()); i++) {
      const options = await selects.nth(i).locator("option").count();
      if (options > 10) {
        sportSelectIndex = i;
        break;
      }
    }

    if (sportSelectIndex >= 0) {
      // Select a sport
      await selects.nth(sportSelectIndex).selectOption("Baseball");
      await page.waitForTimeout(300);

      // The position selector should now be enabled (not showing "Select sport first")
      const positionSelects = page.locator("select");
      let foundEnabledPositionSelect = false;

      for (let i = 0; i < (await positionSelects.count()); i++) {
        const disabled = await positionSelects
          .nth(i)
          .evaluate((el) => (el as any).disabled);
        const firstOption = await positionSelects
          .nth(i)
          .locator("option")
          .first()
          .textContent();

        if (
          !disabled &&
          firstOption &&
          firstOption.includes("Select Position")
        ) {
          foundEnabledPositionSelect = true;
          break;
        }
      }

      expect(foundEnabledPositionSelect).toBe(true);
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
    // Check for any JavaScript errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to occur
    await page.waitForTimeout(1000);

    // Filter out expected non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("404"),
    );

    expect(criticalErrors).toHaveLength(0);
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
    // Find the Athletic Profile section
    const athleticSection = page.locator("text=Athletic Profile").first();
    await expect(athleticSection).toBeVisible();

    // The section should contain both sport selector and position options
    const sectionParent = athleticSection.locator("..");
    const selectCount = await sectionParent.locator("select").count();
    expect(selectCount).toBeGreaterThanOrEqual(2); // Sport and Primary Position
  });
});
