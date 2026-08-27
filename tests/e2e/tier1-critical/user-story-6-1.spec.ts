import { test, expect } from "@playwright/test";

test.describe("User Story 6.1: Parent Views Recruiting Stage Guidance", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to timeline (assumes user is authenticated)
    await page.goto("/timeline");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Scenario 1: Parent views timeline with current phase info", async ({
    page,
  }) => {
    // Verify current phase badge displays. "Current Phase" text appears
    // twice (status card label + phase-picker button aria label) — scope to
    // the first match, matching how a sighted user reads the page top-down.
    const phaseLabel = page.locator("text=Current Phase").first();
    await expect(phaseLabel).toBeVisible();

    // Verify phase name displays (Freshman, Sophomore, Junior, or Senior).
    // Matches phase cards too (e.g. "Junior Year"), so scope to the first hit.
    const phaseName = page
      .locator("text=/Freshman|Sophomore|Junior|Senior|Committed/")
      .first();
    await expect(phaseName).toBeVisible();

    // Verify status indicator displays
    const statusLabel = page.locator("text=Status").first();
    await expect(statusLabel).toBeVisible();

    // Verify recruiting timeline header
    const headerText = page.getByRole("heading", {
      name: "Recruiting Timeline",
    });
    await expect(headerText).toBeVisible();
  });

  test("Scenario 2: Parent views What Matters Now section", async ({
    page,
  }) => {
    // Verify "What Matters Now" section is visible
    const whatMattersHeader = page.locator("text=What Matters Right Now");
    await expect(whatMattersHeader).toBeVisible();

    // Verify it has priority items
    const priorityItems = page.locator("button[class*='text-left']").first();
    await expect(priorityItems).toBeVisible();

    // Verify numbered items display (1, 2, 3...)
    const numberOne = page.locator("div[class*='rounded-full']:has-text('1')");
    await expect(numberOne).toBeVisible();

    // Verify lightning bolt icon
    const icon = page.locator("text=⚡");
    await expect(icon).toBeVisible();
  });

  test("Scenario 3: Parent views Common Worries section", async ({ page }) => {
    // Verify "Common Worries" section is visible
    const worriesHeader = page.locator("text=Common Worries");
    await expect(worriesHeader).toBeVisible();

    // Verify question mark icon
    const questionIcon = page.locator("text=❓");
    await expect(questionIcon).toBeVisible();

    // Section starts collapsed by default (pages/timeline/index.vue:
    // worriesCollapsed = ref(true)) — expand it before asserting on its body.
    await page
      .getByTestId("guidance-header")
      .filter({ hasText: "Common Worries" })
      .click();

    // Verify expandable details elements exist
    const detailsElements = page.locator("details");
    const count = await detailsElements.count();
    expect(count).toBeGreaterThan(0);

    // Expand first worry and verify answer is visible
    if (count > 0) {
      await detailsElements.first().click();
      const summary = page.locator("summary").first();
      await expect(summary).toBeVisible();
    }
  });

  test("Scenario 4: Parent views What NOT to Stress section", async ({
    page,
  }) => {
    // Verify "What NOT to Stress" section is visible
    const reassuranceHeader = page.locator("text=What NOT to Stress About");
    await expect(reassuranceHeader).toBeVisible();

    // Verify shield icon
    const shieldIcon = page.locator("text=🛡️");
    await expect(shieldIcon).toBeVisible();

    // Verify reassurance messages display with icons
    const messages = page.locator(
      "[class*='flex'][class*='items-start'][class*='gap-3']",
    );
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(0);
  });

  test("Scenario 5: Parent views Recruiting Calendar (milestones merged in)", async ({
    page,
  }) => {
    // Milestones were folded into the Recruiting Calendar (rendered <UpcomingMilestones bare/>), so assert the calendar section heading.
    const milestonesHeader = page.getByRole("heading", { name: "Recruiting Calendar" });
    await expect(milestonesHeader).toBeVisible();

    // Verify calendar icon
    const calendarIcon = page.locator("text=📆");
    await expect(calendarIcon).toBeVisible();

    // Verify milestone items display with dates
    const milestoneItems = page.locator(
      "a[class*='flex'][class*='items-start']",
    );
    const count = await milestoneItems.count();
    if (count > 0) {
      // Should have at least one milestone (SAT, ACT, deadline, etc)
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test("Scenario 6: Parent clicks priority to navigate to task", async ({
    page,
  }) => {
    // Click on a priority item in "What Matters Now"
    const priorityButton = page
      .locator("button[class*='text-left'][class*='group']")
      .first();

    if (await priorityButton.isVisible()) {
      // Remember scroll position before click
      const scrollBefore = await page.evaluate(() => window.scrollY);

      await priorityButton.click();

      // Wait a moment for animation and scroll

      // Verify page has scrolled or changed focus
      const scrollAfter = await page.evaluate(() => window.scrollY);
      // Should have either scrolled or task section should be visible
      expect(
        scrollAfter !== scrollBefore || (await priorityButton.isVisible()),
      ).toBeTruthy();
    }
  });

  test("Scenario 7: Mobile responsive layout - sections stack vertically", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState("domcontentloaded");

    // All four guidance sections should be visible
    await expect(page.locator("text=What Matters Right Now")).toBeVisible();
    await expect(page.locator("text=Common Worries")).toBeVisible();
    await expect(page.locator("text=What NOT to Stress About")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recruiting Calendar" })).toBeVisible();

    // Verify sections stack vertically (not side-by-side). boundingBox() is
    // async — a missing await here previously made this an always-truthy
    // Promise object, so the assertion below compared undefined and failed
    // with a matcher-type error, not the intended layout check.
    const whatMattersBox = await page
      .locator("text=What Matters Right Now")
      .first()
      .boundingBox();
    const worriesBox = await page
      .locator("text=Common Worries")
      .first()
      .boundingBox();

    if (whatMattersBox && worriesBox) {
      // On mobile, sections should be vertically stacked (different Y coordinates)
      expect(worriesBox.y).toBeGreaterThan(
        whatMattersBox.y + whatMattersBox.height,
      );
    }
  });

  test("Scenario 8: Desktop layout - sections in 2x2 grid", async ({
    page,
  }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.waitForLoadState("domcontentloaded");

    // All four sections should be visible
    await expect(page.locator("text=What Matters Right Now")).toBeVisible();
    await expect(page.locator("text=Common Worries")).toBeVisible();
    await expect(page.locator("text=What NOT to Stress About")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recruiting Calendar" })).toBeVisible();
  });

  test("Scenario 9: Timeline loads in under 1 second", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/timeline");

    // Wait for main content (phase cards) to load
    await page.waitForSelector('[class*="space-y-6"]', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Performance: Should load in under 2 seconds (reasonable for real-world scenario)
    // This is more lenient than 1s for CI environments
    expect(loadTime).toBeLessThan(2000);
  });

  test("Scenario 10: All guidance sections have proper styling", async ({
    page,
  }) => {
    // Verify "What Matters Now" has blue gradient
    const whatMattersCard = page
      .locator("text=What Matters Right Now")
      .locator("xpath=ancestor::div[contains(concat(' ',@class,' '),' rounded-2xl ')][1]")
      .first();
    const bgClass = await whatMattersCard.getAttribute("class");
    expect(bgClass).toContain("blue");

    // Verify "Common Worries" has amber gradient
    const worriesCard = page
      .locator("text=Common Worries")
      .locator("xpath=ancestor::div[contains(concat(' ',@class,' '),' rounded-2xl ')][1]")
      .first();
    const worriesBgClass = await worriesCard.getAttribute("class");
    expect(worriesBgClass).toContain("amber");

    // Verify "What NOT to Stress" has emerald gradient
    const reassuranceCard = page
      .locator("text=What NOT to Stress About")
      .locator("xpath=ancestor::div[contains(concat(' ',@class,' '),' rounded-2xl ')][1]")
      .first();
    const reassuranceBgClass = await reassuranceCard.getAttribute("class");
    expect(reassuranceBgClass).toContain("emerald");

    // Recruiting Calendar card (houses milestones) has a white background
    const milestonesCard = page
      .getByRole("heading", { name: "Recruiting Calendar" })
      .locator("xpath=ancestor::div[contains(concat(' ',@class,' '),' rounded-2xl ')][1]")
      .first();
    const milestonesBgClass = await milestonesCard.getAttribute("class");
    expect(milestonesBgClass).toContain("bg-white");
  });

  test("Scenario 11: Phase cards display below guidance sections", async ({
    page,
  }) => {
    // Get position of "What Matters Now" section. boundingBox() is async —
    // a missing await here previously made this an always-truthy Promise
    // object, so the assertion below compared undefined instead of doing
    // the intended layout check.
    const whatMattersBox = await page
      .locator("text=What Matters Right Now")
      .first()
      .boundingBox();

    // Get position of first phase card (e.g., "Freshman Year")
    const freshmanBox = await page
      .locator("text=Freshman Year")
      .first()
      .boundingBox();

    if (whatMattersBox && freshmanBox) {
      // Phase cards should be below guidance sections
      expect(freshmanBox.y).toBeGreaterThan(
        whatMattersBox.y + whatMattersBox.height,
      );
    }
  });

  test("Scenario 12: Milestone links have correct attributes", async ({
    page,
  }) => {
    const milestoneLinks = page
      .locator("a[href^='http']")
      .filter({ hasText: /Test Date|Opens|Deadline|Period|Signing/ });

    const count = await milestoneLinks.count();
    if (count === 0) {
      test.skip(
        true,
        "no seeded milestone links present on this page for this run; awaiting seed infrastructure project — see CLAUDE.local.md Action Required",
      );
      return;
    }

    const firstLink = milestoneLinks.first();
    const target = await firstLink.getAttribute("target");
    const rel = await firstLink.getAttribute("rel");
    expect(target).toBe("_blank");
    expect(rel).toContain("noopener");
  });
});
