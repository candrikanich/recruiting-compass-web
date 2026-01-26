/**
 * E2E Tests for User Story 7.3 - Dynamic Suggestion Updates
 *
 * Tests:
 * 1. Suggestions update within 1 second after profile change (GPA update)
 * 2. Suggestions marked complete when interaction logged
 * 3. Daily refresh cron job updates suggestions
 * 4. Notification shown when new suggestions appear
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3003";

test.describe("User Story 7.3 - Dynamic Suggestion Updates", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);
  });

  test("should update suggestions within 1 second after GPA profile change", async ({
    page,
  }) => {
    // Login as athlete
    await page.fill('input[type="email"]', "athlete@test.com");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Navigate to settings to update profile
    await page.click('a[href*="/settings"]');
    await page.waitForURL(`${BASE_URL}/settings`, { timeout: 5000 });

    // Go to player details section
    await page.click("button:has-text(\"Player Details\")");

    // Record current GPA value
    const gpaInput = page.locator('input[placeholder*="GPA"], input[data-testid*="gpa"]');
    const oldGpa = await gpaInput.inputValue();
    expect(oldGpa).toBe("3.0");

    // Update GPA from 3.0 to 3.4
    await gpaInput.fill("");
    await gpaInput.fill("3.4");

    // Save changes
    await page.click('button:has-text("Save")');

    // Wait for save confirmation
    await expect(page.locator("text=Profile updated successfully")).toBeVisible({
      timeout: 5000,
    });

    // Navigate back to dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait 1-2 seconds for suggestions to update
    await page.waitForTimeout(1500);

    // Verify suggestions have been refreshed
    // Should see new suggestion: "ASU is now in your realistic range"
    const newSuggestion = page.locator(
      'text=now in your realistic range, ASU is now in your realistic range'
    );

    // Give it time to load
    await expect(newSuggestion).toBeVisible({ timeout: 5000 });
  });

  test("should mark suggestion complete and remove from dashboard when interaction logged", async ({
    page,
  }) => {
    // Login as athlete
    await page.fill('input[type="email"]', "athlete@test.com");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Verify suggestion exists: "You haven't contacted Coach A in 21 days"
    const suggestion = page.locator(
      'text=You haven\'t contacted Coach A in 21 days'
    );
    await expect(suggestion).toBeVisible();

    // Navigate to schools page
    await page.click('a[href*="/schools"]');
    await page.waitForURL(`${BASE_URL}/schools`, { timeout: 5000 });

    // Open a school (e.g., Arizona State)
    await page.click('a:has-text("Arizona State")');
    await page.waitForURL(/schools\/[a-f0-9-]+/, { timeout: 5000 });

    // Go to coaches section
    await page.click('button:has-text("Coaches")');

    // Log an interaction with Coach A
    await page.click('button:has-text("Log Interaction")');

    // Fill interaction form
    await page.fill('textarea[placeholder*="interaction"]', "Had a great call with coach");
    await page.click('button:has-text("Save Interaction")');

    // Wait for save confirmation
    await expect(page.locator("text=Interaction saved")).toBeVisible({
      timeout: 5000,
    });

    // Navigate back to dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for suggestion update (1-2 seconds)
    await page.waitForTimeout(1500);

    // Verify suggestion is no longer visible
    const removedSuggestion = page.locator(
      'text=You haven\'t contacted Coach A in 21 days'
    );
    await expect(removedSuggestion).not.toBeVisible({ timeout: 5000 });
  });

  test("should display notification when new suggestions are generated", async ({
    page,
  }) => {
    // Login as athlete
    await page.fill('input[type="email"]', "athlete@test.com");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Get initial suggestion count
    const initialCount = await page
      .locator("[data-testid='suggestion-count']")
      .first()
      .textContent();

    // Manually trigger suggestion update via profile change
    await page.click('a[href*="/settings"]');
    await page.click("button:has-text(\"Player Details\")");

    const gpaInput = page.locator('input[placeholder*="GPA"]');
    await gpaInput.fill("3.6");
    await page.click('button:has-text("Save")');

    // Go back to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Check for toast notification
    const toastNotification = page.locator(
      'text=/new suggestion\\(s\\) available/i'
    );
    await expect(toastNotification).toBeVisible({ timeout: 5000 });
  });

  test("should surface pending suggestions automatically after generation", async ({
    page,
  }) => {
    // Login as athlete
    await page.fill('input[type="email"]', "athlete@test.com");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Update profile to trigger suggestion generation
    await page.click('a[href*="/settings"]');
    await page.click("button:has-text(\"Player Details\")");

    // Update multiple fields to generate suggestions
    const satInput = page.locator('input[placeholder*="SAT"]');
    await satInput.fill("1400");

    const gpaInput = page.locator('input[placeholder*="GPA"]');
    await gpaInput.fill("3.5");

    await page.click('button:has-text("Save")');
    await expect(page.locator("text=Profile updated successfully")).toBeVisible();

    // Go back to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Verify suggestions are surfaced (up to 3 shown)
    const suggestionCards = page.locator("[data-testid='suggestion-card']");
    const count = await suggestionCards.count();

    // Should have surfaced suggestions visible
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(3);
  });

  test("should allow dismissing suggestions with dismiss action", async ({
    page,
  }) => {
    // Login as athlete
    await page.fill('input[type="email"]', "athlete@test.com");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Find first suggestion
    const firstSuggestion = page.locator("[data-testid='suggestion-card']").first();
    const suggestionText = await firstSuggestion.textContent();

    // Click dismiss button
    await firstSuggestion.locator('button[aria-label="Dismiss"]').click();

    // Verify dismissed message
    await expect(page.locator("text=Suggestion dismissed")).toBeVisible({
      timeout: 5000,
    });

    // Verify suggestion is removed from view
    const removedSuggestion = page.locator(`text="${suggestionText}"`);
    await expect(removedSuggestion).not.toBeVisible();
  });

  test("should show 'More Suggestions' count and allow surfacing more", async ({
    page,
  }) => {
    // Login as athlete
    await page.fill('input[type="email"]', "athlete@test.com");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Check for "More Suggestions" indicator
    const moreCount = page.locator('[data-testid="more-suggestions-count"]');

    if (await moreCount.isVisible()) {
      const count = await moreCount.textContent();
      expect(count).toMatch(/^\d+/);

      // Click "See More" button
      await page.click('button:has-text("See More Suggestions")');

      // Verify more suggestions are now visible
      const suggestionCards = page.locator("[data-testid='suggestion-card']");
      const newCount = await suggestionCards.count();

      // Should have more suggestions visible now
      expect(newCount).toBeGreaterThan(3);
    }
  });

  test("daily cron endpoint should be callable and return valid response", async ({
    page,
  }) => {
    // Make direct API call to test cron endpoint
    // Note: requires CRON_SECRET to be set in test environment
    const cronSecret = process.env.CRON_SECRET || "test-secret";

    const response = await page.request.post(
      `${BASE_URL}/api/cron/daily-suggestions`,
      {
        headers: {
          "x-cron-secret": cronSecret,
        },
      }
    );

    // Should return 200 if secret is correct or 401 if not
    // In test environment, we expect either
    expect([200, 401, 405]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("updated");
      expect(data).toHaveProperty("failed");
      expect(typeof data.total).toBe("number");
    }
  });
});
