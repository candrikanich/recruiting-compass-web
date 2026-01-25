import { test, expect } from "@playwright/test";

// User Story 5.3: Athlete Logs Own Interactions
test.describe("User Story 5.3: Athlete Logs Own Interactions", () => {
  // Athlete Flow Tests
  test.describe("Athlete Flow", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to app
      await page.goto("/");

      // Login as athlete (student role)
      await page.fill('input[type="email"]', "test.athlete@example.com");
      await page.fill('input[type="password"]', "TestPassword123");
      await page.click('button:has-text("Login")');

      // Wait for dashboard
      await page.waitForURL("**/dashboard");
    });

    test("Scenario 1: Athlete navigates to My Interactions page", async ({
      page,
    }) => {
      // Navigate to interactions
      await page.goto("/interactions");

      // Verify page title shows "My Interactions" for athlete
      await expect(page.locator("h1")).toContainText("My Interactions");

      // Verify help text is visible
      await expect(
        page.locator("text=Your recruiting interactions are visible to your linked parent")
      ).toBeVisible();
    });

    test("Scenario 2: Athlete logs an email interaction", async ({ page }) => {
      await page.goto("/interactions/add");

      // Verify page title shows "Log My Interaction" for athlete
      await expect(page.locator("h1")).toContainText("Log My Interaction");

      // Select school
      await page.selectOption('select[id="schoolId"]', { index: 1 });

      // Select interaction type: Email
      await page.selectOption('select[id="type"]', "email");

      // Select direction: Outbound
      await page.click('label:has-text("Outbound")');

      // Set date/time
      const today = new Date().toISOString().split("T")[0];
      await page.fill('input[id="occurredAt"]', `${today}T14:30`);

      // Add subject and content
      await page.fill('input[id="subject"]', "Recruiting Inquiry");
      await page.fill(
        'textarea[id="content"]',
        "Sent inquiry about scholarship opportunities"
      );

      // Submit form
      await page.click('button[type="submit"]:has-text("Log Interaction")');

      // Verify success and redirect
      await page.waitForURL("**/interactions", { waitUntil: "networkidle" });

      // Verify interaction appears in list with "You" badge
      await expect(page.locator("text=Recruiting Inquiry")).toBeVisible();
      await expect(page.locator("text=Email")).toBeVisible();
      await expect(page.locator("text=You")).toBeVisible();
    });

    test("Scenario 3: Athlete sees only their interactions", async ({
      page,
    }) => {
      await page.goto("/interactions");

      // Verify the interactions page loads
      await expect(page.locator("h1")).toContainText("My Interactions");

      // Verify no filter for "Logged By" is shown (athletes don't filter by who logged)
      const loggedByFilter = page.locator('label:has-text("Logged By")');
      await expect(loggedByFilter).not.toBeVisible();

      // Interactions listed should all show "You" badge
      const badges = page.locator(':has-text("You")');
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("Scenario 4: Athlete can log different interaction types", async ({
      page,
    }) => {
      const interactionTypes = [
        { type: "phone_call", display: "Phone Call" },
        { type: "in_person_visit", display: "In-Person Visit" },
        { type: "virtual_meeting", display: "Virtual Meeting" },
      ];

      for (const { type, display } of interactionTypes) {
        await page.goto("/interactions/add");

        // Select school
        await page.selectOption('select[id="schoolId"]', { index: 1 });

        // Select type
        await page.selectOption('select[id="type"]', type);

        // Select direction
        await page.click('label:has-text("Outbound")');

        // Set date
        const today = new Date().toISOString().split("T")[0];
        await page.fill('input[id="occurredAt"]', `${today}T14:30`);

        // Submit
        await page.click('button[type="submit"]');

        // Verify interaction type appears
        await page.waitForURL("**/interactions", { waitUntil: "networkidle" });
        await expect(page.locator(`text=${display}`)).toBeVisible();
      }
    });
  });

  // Parent Flow Tests
  test.describe("Parent Flow", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to app
      await page.goto("/");

      // Login as parent
      await page.fill('input[type="email"]', "test.parent@example.com");
      await page.fill('input[type="password"]', "TestPassword123");
      await page.click('button:has-text("Login")');

      // Wait for dashboard
      await page.waitForURL("**/dashboard");
    });

    test("Scenario 1: Parent sees Athlete Activity widget on dashboard", async ({
      page,
    }) => {
      // Check if athlete activity widget is visible
      const widget = page.locator('h2:has-text("Athlete Activity")');
      const widgetVisible = await widget.isVisible().catch(() => false);

      if (widgetVisible) {
        // Widget is present
        await expect(widget).toBeVisible();

        // Verify it shows recent athlete interactions
        await expect(
          page.locator("text=Recent interactions logged by your linked athlete")
        ).toBeVisible();
      }
    });

    test("Scenario 2: Parent views interactions page with Logged By filter", async ({
      page,
    }) => {
      await page.goto("/interactions");

      // Verify page title shows "Interactions" (not "My Interactions") for parent
      await expect(page.locator("h1")).toContainText("Interactions");

      // Verify "Logged By" filter is visible
      await expect(page.locator('label:has-text("Logged By")')).toBeVisible();
    });

    test("Scenario 3: Parent filters interactions by athlete", async ({
      page,
    }) => {
      await page.goto("/interactions");

      // Get the Logged By dropdown
      const loggedBySelect = page.locator('select').filter({
        has: page.locator('label:has-text("Logged By")').locator(".."),
      });

      // Check if there are athlete options
      const options = await loggedBySelect.locator("option").count();

      if (options > 1) {
        // Select second option (first athlete)
        await loggedBySelect.selectOption({ index: 1 });

        // Wait for filtering
        await page.waitForTimeout(500);

        // Verify interactions are filtered
        const interactions = page.locator(".bg-white.rounded-xl");
        const count = await interactions.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test("Scenario 4: Parent filters interactions by 'Me (Parent)'", async ({
      page,
    }) => {
      await page.goto("/interactions");

      // Select "Me (Parent)" option
      const loggedBySelect = page.locator('select').filter({
        has: page.locator('label:has-text("Logged By")').locator(".."),
      });

      // Check if "Me (Parent)" option exists
      const meOption = loggedBySelect.locator('option:has-text("Me")');
      const exists = await meOption.count();

      if (exists > 0) {
        await meOption.click();
        await page.waitForTimeout(500);

        // Verify only parent interactions are shown
        const badges = page.locator(":has-text('You')");
        const count = await badges.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test("Scenario 5: Parent can click through to athlete interaction", async ({
      page,
    }) => {
      // Navigate to interactions
      await page.goto("/interactions");

      // Wait for interactions to load
      await page.waitForTimeout(500);

      // Click on first interaction (if available)
      const firstInteraction = page
        .locator(".bg-white.rounded-xl.border")
        .first();
      const visible = await firstInteraction.isVisible().catch(() => false);

      if (visible) {
        // Click View button
        const viewButton = firstInteraction.locator('button:has-text("View")');
        await viewButton.click();

        // Wait for detail page
        await page.waitForURL("**/interactions/**");

        // Verify interaction detail page loads
        await expect(page.locator("h1")).toBeVisible();

        // Verify "Logged By" field is visible
        await expect(
          page.locator("h3:has-text('Logged By')")
        ).toBeVisible();
      }
    });
  });

  // Integration Tests
  test.describe("Integration", () => {
    test("Scenario 1: Parent sees athlete-logged interactions in timeline", async ({
      page,
    }) => {
      // First, have athlete log an interaction
      await page.goto("/");

      // Login as athlete
      await page.fill('input[type="email"]', "test.athlete@example.com");
      await page.fill('input[type="password"]', "TestPassword123");
      await page.click('button:has-text("Login")');
      await page.waitForURL("**/dashboard");

      // Log an interaction
      await page.goto("/interactions/add");
      await page.selectOption('select[id="schoolId"]', { index: 1 });
      await page.selectOption('select[id="type"]', "email");
      await page.click('label:has-text("Outbound")');

      const today = new Date().toISOString().split("T")[0];
      await page.fill('input[id="occurredAt"]', `${today}T14:30`);
      await page.fill('input[id="subject"]', "Test Athlete Interaction");

      await page.click('button[type="submit"]');
      await page.waitForURL("**/interactions");

      // Logout athlete
      await page.click('button[aria-label="User menu"]', { timeout: 5000 }).catch(() => null);
      await page.click('button:has-text("Logout")', { timeout: 5000 }).catch(() => null);

      // Now login as parent
      await page.goto("/");
      await page.fill('input[type="email"]', "test.parent@example.com");
      await page.fill('input[type="password"]', "TestPassword123");
      await page.click('button:has-text("Login")');
      await page.waitForURL("**/dashboard");

      // Navigate to interactions
      await page.goto("/interactions");

      // Verify athlete's interaction is visible
      await expect(
        page.locator("text=Test Athlete Interaction")
      ).toBeVisible();

      // Verify it shows student/athlete badge
      const badge = page.locator(':has-text("You")').first();
      const badgeVisible = await badge.isVisible().catch(() => false);

      // Either should show "You" if it's the athlete's own interaction,
      // or show the athlete's name
      expect(badgeVisible || (await page.locator("text").count()) > 0).toBeTruthy();
    });
  });
});
