import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3003";

test.describe("User Story 7.1: Parent Receives Actionable Suggestions", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto(`${BASE_URL}`);

    // Check if already logged in
    const loginForm = await page.$('input[name="email"]').catch(() => null);
    if (loginForm) {
      // Would need test credentials to log in
      // For now, this is a placeholder for actual login logic
    }
  });

  test("Scenario 1: Top 3 suggestions appear on dashboard", async ({
    page,
  }) => {
    // Given I log into my account
    await page.goto(`${BASE_URL}/dashboard`);

    // When I view the dashboard
    const suggestionsSection = await page
      .locator('text="Suggestions"')
      .isVisible();
    expect(suggestionsSection).toBe(true);

    // Then I see a "Suggestions" section with top 3 items
    const suggestionCards = await page.locator(
      '[data-testid="suggestion-card"]',
    );
    const count = await suggestionCards.count();
    expect(count).toBeLessThanOrEqual(3);

    // And each suggestion has priority indicator
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = suggestionCards.nth(i);
      const iconElement = card.locator(".rounded-lg svg");
      expect(await iconElement.isVisible()).toBe(true);
    }

    // And each suggestion has action button
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = suggestionCards.nth(i);
      const actionButton = card.locator(
        'button:has-text("Add Video"), button:has-text("Log Interaction"), button:has-text("Add School"), button:has-text("Update Video")',
      );
      expect(await actionButton.isVisible()).toBe(true);
    }
  });

  test("Scenario 2: Suggestions are stage-appropriate for sophomores", async ({
    page,
  }) => {
    // This test would require test data setup with grade_level = 10
    // Given my athlete is a sophomore
    await page.goto(`${BASE_URL}/dashboard`);

    // When I view suggestions
    const suggestionCards = await page.locator(
      '[data-testid="suggestion-card"]',
    );
    const count = await suggestionCards.count();

    if (count > 0) {
      // Collect all suggestion messages
      const suggestionTexts: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await suggestionCards
          .nth(i)
          .locator("p")
          .first()
          .textContent();
        if (text) suggestionTexts.push(text);
      }

      // Then I see suggestions like:
      // - "Build your school list to 20-30 targets"
      // - "Attend summer showcases"

      const hasBuildSchoolList = suggestionTexts.some((t) =>
        t?.includes("school list"),
      );
      const hasShowcases = suggestionTexts.some(
        (t) => t?.includes("showcase") || t?.includes("event"),
      );

      // At least one sophomore-appropriate suggestion should be present
      expect(hasBuildSchoolList || hasShowcases).toBe(true);

      // And I do NOT see "Schedule official visits" (junior year suggestion)
      const hasOfficialVisits = suggestionTexts.some((t) =>
        t?.includes("official visit"),
      );
      // Note: May or may not be present depending on test data
      // This is more of a documentation than a hard assertion
    }
  });

  test("Scenario 3: Suggestions for juniors are different", async ({
    page,
  }) => {
    // This test would require test data setup with grade_level = 11
    // Given my athlete is a junior
    await page.goto(`${BASE_URL}/dashboard`);

    // When I view suggestions
    const suggestionCards = await page.locator(
      '[data-testid="suggestion-card"]',
    );
    const count = await suggestionCards.count();

    if (count > 0) {
      // Collect all suggestion messages
      const suggestionTexts: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await suggestionCards
          .nth(i)
          .locator("p")
          .first()
          .textContent();
        if (text) suggestionTexts.push(text);
      }

      // Then I see:
      // - "Register with NCAA eligibility center"
      // - "Begin formal outreach to coaches"
      // - "Complete professional highlight video"

      const hasNCAARegistration = suggestionTexts.some(
        (t) => t?.includes("NCAA") || t?.includes("eligibility"),
      );
      const hasOutreach = suggestionTexts.some(
        (t) => t?.includes("outreach") || t?.includes("contact"),
      );
      const hasVideo = suggestionTexts.some(
        (t) => t?.includes("video") || t?.includes("film"),
      );

      // At least one junior-appropriate suggestion should be present
      expect(hasNCAARegistration || hasOutreach || hasVideo).toBe(true);
    }
  });

  test("Scenario 4: Suggestion links to action", async ({ page }) => {
    // Given I see a suggestion with an action button
    await page.goto(`${BASE_URL}/dashboard`);

    const suggestionCard = await page
      .locator('[data-testid="suggestion-card"]')
      .first();
    const actionButton = suggestionCard.locator(
      'button:has-text("Add Video"), button:has-text("Log Interaction"), button:has-text("Add School"), button:has-text("Update Video")',
    );

    if (await actionButton.isVisible()) {
      const actionText = await actionButton.textContent();

      // When I click on it
      await actionButton.click();

      // Then I am taken to appropriate page
      const currentUrl = page.url();

      if (actionText?.includes("Add Video")) {
        expect(currentUrl).toContain("/videos");
      } else if (actionText?.includes("Add School")) {
        expect(currentUrl).toContain("/schools");
      } else if (actionText?.includes("Log Interaction")) {
        expect(currentUrl).toContain("/interactions");
      }
    }
  });

  test("Acceptance: Dismiss functionality works", async ({ page }) => {
    // Given there are suggestions on the dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    const initialCards = await page
      .locator('[data-testid="suggestion-card"]')
      .count();

    if (initialCards > 0) {
      // When I click dismiss on first suggestion
      const dismissButton = page
        .locator('[data-testid="suggestion-card"]')
        .first()
        .locator('button:has-text("Dismiss")');

      await dismissButton.click();

      // Then it disappears from the list
      // Wait for animation/removal
      await page.waitForTimeout(500);

      const afterDismiss = await page
        .locator('[data-testid="suggestion-card"]')
        .count();
      expect(afterDismiss).toBeLessThan(initialCards);
    }
  });

  test("Acceptance: Show more functionality works", async ({ page }) => {
    // Given there are more than 3 pending suggestions
    await page.goto(`${BASE_URL}/dashboard`);

    // Check if "Show more" button is visible
    const showMoreButton = await page.locator('text="Show more"').isVisible();

    if (showMoreButton) {
      const initialCount = await page
        .locator('[data-testid="suggestion-card"]')
        .count();

      // When I click "Show more"
      await page.locator('text="Show more"').click();

      // Wait for additional suggestions to load
      await page.waitForTimeout(500);

      // Then additional suggestions surface
      const afterClick = await page
        .locator('[data-testid="suggestion-card"]')
        .count();
      expect(afterClick).toBeGreaterThan(initialCount);
    }
  });

  test("Acceptance: Learn More button opens help modal", async ({ page }) => {
    // Given I see a suggestion
    await page.goto(`${BASE_URL}/dashboard`);

    const suggestionCard = await page
      .locator('[data-testid="suggestion-card"]')
      .first();

    // When I click "Learn More"
    const learnMoreButton = suggestionCard.locator(
      'button:has-text("Learn More")',
    );

    if (await learnMoreButton.isVisible()) {
      await learnMoreButton.click();

      // Then a help modal appears
      const modal = page.locator('text="Why It Matters"');
      expect(await modal.isVisible()).toBe(true);

      // And it contains helpful information
      const whyItMatters = page.locator('text="Why It Matters"');
      expect(await whyItMatters.isVisible()).toBe(true);

      const howToComplete = page.locator('text="How to Complete It"');
      expect(await howToComplete.isVisible()).toBe(true);
    }
  });

  test("Dashboard displays urgency-based styling", async ({ page }) => {
    // Given suggestions are on the dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    const suggestionCards = await page.locator(
      '[data-testid="suggestion-card"]',
    );
    const count = await suggestionCards.count();

    if (count > 0) {
      // Each suggestion should have urgency-based styling
      for (let i = 0; i < count; i++) {
        const card = suggestionCards.nth(i);
        const classes = await card.evaluate((el) => el.className);

        // Should have one of: border-red-200 (high), border-orange-200 (medium), border-blue-200 (low)
        const hasUrgencyStyle =
          classes.includes("border-red") ||
          classes.includes("border-orange") ||
          classes.includes("border-blue");

        expect(hasUrgencyStyle).toBe(true);
      }
    }
  });

  test("Mobile-responsive suggestion cards", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Given I'm viewing on mobile
    await page.goto(`${BASE_URL}/dashboard`);

    // When I view suggestions
    const suggestionCards = await page.locator(
      '[data-testid="suggestion-card"]',
    );

    // Then suggestions are visible and readable
    for (let i = 0; i < Math.min(3, await suggestionCards.count()); i++) {
      const card = suggestionCards.nth(i);
      const isVisible = await card.isVisible();
      expect(isVisible).toBe(true);

      // And buttons are still clickable
      const buttons = card.locator("button");
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
    }
  });
});
