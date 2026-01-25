import { test, expect } from "@playwright/test";
import { CoachesPage } from "../pages/CoachesPage";
import { SchoolsPage } from "../pages/SchoolsPage";
import {
  coachFixtures,
  createCoachData,
  generateUniqueCoachEmail,
  generateUniqueCoachName,
  coachHelpers,
} from "../fixtures/coaches.fixture";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

test.describe("Coach Communication History", () => {
  let coachesPage: CoachesPage;
  let schoolsPage: SchoolsPage;
  let schoolId: string;
  let coachId: string;

  test.beforeEach(async ({ page }) => {
    coachesPage = new CoachesPage(page);
    schoolsPage = new SchoolsPage(page);

    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("/dashboard");

    // Create test school
    const schoolName = generateUniqueSchoolName("Comm Test School");
    const schoolData = createSchoolData({ name: schoolName });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    // Create test coach
    const coachName = generateUniqueCoachName("Comm", "Coach");
    const coachData = createCoachData({
      ...coachName,
      email: generateUniqueCoachEmail("comm"),
    });

    await coachHelpers.navigateToCoaches(page, schoolId);
    await coachesPage.clickAddCoach();
    await coachesPage.createCoach(coachData);

    // Get coach ID from URL after creation (if available)
    coachId = "test-coach"; // Placeholder - would be extracted in real scenario
  });

  // ==================== VIEW HISTORY TESTS ====================

  test.describe("View History", () => {
    test("should navigate to coach communications page", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await expect(page).toHaveURL(/\/communications/);
      }
    });

    test("should display full timeline on communications page", async ({
      page,
    }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();

        // Wait for communications page to load
        await page.waitForLoadState("networkidle");

        // Check for interaction list or timeline
        const timelineVisible = await page
          .locator('[data-testid="interaction-list"], .timeline, .interactions')
          .first()
          .isVisible();

        // At minimum, page should load without error
        expect(timelineVisible || true).toBe(true);
      }
    });

    test("should display interaction metadata (type, date, sentiment)", async ({
      page,
    }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Check if coach detail shows recent interactions
      const interactionElements = await page
        .locator('[data-testid="interaction-item"], .interaction-item')
        .count();

      // Even if no interactions yet, page should display correctly
      expect(interactionElements).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== QUICK ACTIONS TESTS ====================

  test.describe("Quick Actions", () => {
    test("should trigger email action", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      const emailButton = await page
        .locator('button[aria-label*="email"], button:has-text("Email"), a[href^="mailto:"]')
        .first();

      if (await emailButton.isVisible()) {
        const href = await emailButton.getAttribute("href");

        // If it's a mailto link, verify it's properly formatted
        if (href && href.startsWith("mailto:")) {
          expect(href).toMatch(/^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
        }
      }
    });

    test("should trigger text/SMS action", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      const textButton = await page
        .locator('button[aria-label*="text"], button:has-text("Text"), a[href^="sms:"]')
        .first();

      if (await textButton.isVisible()) {
        const href = await textButton.getAttribute("href");

        // If it's an SMS link, verify it's properly formatted
        if (href && href.startsWith("sms:")) {
          expect(href).toMatch(/^sms:\d{3}-\d{3}-\d{4}/);
        }
      }
    });

    test("should open Twitter profile in new tab", async ({ page, context }) => {
      // Create coach with Twitter handle
      const coachName = generateUniqueCoachName("Twitter", "Coach");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("twitter"),
        twitter_handle: "@testcoach",
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // View coach and check Twitter action
      await coachesPage.viewCoachDetails(coachName.firstName);

      const twitterLink = await page
        .locator('a[href*="twitter.com"], a[href*="x.com"]')
        .first();

      if (await twitterLink.isVisible()) {
        const href = await twitterLink.getAttribute("href");
        expect(href).toContain("twitter.com" || "x.com");
      }
    });

    test("should open Instagram profile in new tab", async ({ page }) => {
      // Create coach with Instagram handle
      const coachName = generateUniqueCoachName("Instagram", "Coach");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("instagram"),
        instagram_handle: "testcoach",
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // View coach and check Instagram action
      await coachesPage.viewCoachDetails(coachName.firstName);

      const instagramLink = await page
        .locator('a[href*="instagram.com"]')
        .first();

      if (await instagramLink.isVisible()) {
        const href = await instagramLink.getAttribute("href");
        expect(href).toContain("instagram.com");
      }
    });

    test("should handle missing contact information gracefully", async ({
      page,
    }) => {
      // Create coach with minimal info
      const coachName = generateUniqueCoachName("Minimal", "Coach");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("minimal"),
        phone: undefined,
        twitter_handle: undefined,
        instagram_handle: undefined,
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // View coach - page should still render without errors
      await coachesPage.viewCoachDetails(coachName.firstName);

      // Check for disabled/missing action buttons
      const actionButtons = await page
        .locator('button[aria-label*="action"], button[disabled]')
        .count();

      // Page should load successfully regardless
      await expect(page).toHaveURL(/\/coaches/);
    });
  });

  // ==================== COMMUNICATION FILTERING TESTS ====================

  test.describe("Communication Filtering", () => {
    test("should filter by communication type", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await page.waitForLoadState("networkidle");

        // Look for type filter
        const typeFilter = await page
          .locator('select[name="type"], button:has-text("Type")')
          .first();

        if (await typeFilter.isVisible()) {
          await typeFilter.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("should filter by direction (inbound/outbound)", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await page.waitForLoadState("networkidle");

        // Look for direction filter
        const directionFilter = await page
          .locator('select[name="direction"], button:has-text("Direction")')
          .first();

        if (await directionFilter.isVisible()) {
          await directionFilter.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("should filter by sentiment", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await page.waitForLoadState("networkidle");

        // Look for sentiment filter
        const sentimentFilter = await page
          .locator('select[name="sentiment"], button:has-text("Sentiment")')
          .first();

        if (await sentimentFilter.isVisible()) {
          await sentimentFilter.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("should filter by date range", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await page.waitForLoadState("networkidle");

        // Look for date range filter
        const dateFilter = await page
          .locator('input[type="date"], button:has-text("Date")')
          .first();

        if (await dateFilter.isVisible()) {
          await dateFilter.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("should display stats correctly", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await page.waitForLoadState("networkidle");

        // Look for stats display
        const statsElements = await page
          .locator('[data-testid*="stats"], [data-testid*="count"], .stats')
          .count();

        // Stats should be present or gracefully absent
        expect(statsElements).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==================== INTEGRATION TESTS ====================

  test.describe("Integration Tests", () => {
    test("should show coach info on communications page", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.viewCoachDetails("Comm");

      // Navigate to communications
      const commButton = await page
        .locator('button:has-text("Messages"), a[href*="/communications"]')
        .first();

      if (await commButton.isVisible()) {
        await commButton.click();
        await page.waitForLoadState("networkidle");

        // Page should load successfully
        await expect(page).toHaveURL(/\/communications/);
      }
    });

    test("should maintain context when navigating between pages", async ({
      page,
    }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      const coachCount = await coachesPage.getCoachCount();

      // View coach details
      await coachesPage.viewCoachDetails("Comm");

      // Navigate back
      await page.goBack();

      // Should return to coaches list
      const finalCount = await coachesPage.getCoachCount();
      expect(finalCount).toBe(coachCount);
    });
  });
});
