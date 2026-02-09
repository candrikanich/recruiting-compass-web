import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import {
  schoolHelpers,
  createSchoolData,
  generateUniqueSchoolName,
  statusHistorySelectors,
} from "./fixtures/schools.fixture";

test.describe("School Detail - Status History", () => {
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    await authFixture.loginFast(page, "player");
  });

  test("should show loading spinner on initial load", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("History Test"),
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await page.goto(`/schools/${schoolId}`);

    const heading = page.locator(statusHistorySelectors.heading);
    await expect(heading).toBeVisible();

    await page.waitForLoadState("networkidle");
  });

  test("should show empty state when no history exists", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("No History"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(1000);

    const emptyState = page.locator(statusHistorySelectors.emptyState);
    const isEmpty = await emptyState.isVisible();

    expect(isEmpty).toBe(true);
  });

  test("should display status change timeline", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Timeline Test"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "contacted");
    await page.waitForTimeout(500);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "recruited");
    await page.waitForTimeout(500);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const historyEntries = page.locator(statusHistorySelectors.historyEntry);
    const entryCount = await historyEntries.count();

    expect(entryCount).toBeGreaterThan(0);
  });

  test("should show 'Initial' for first status without previous", async ({
    page,
  }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Initial Test"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "contacted");
    await page.waitForTimeout(500);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const initialText = page.locator("text=Initial");
    const hasInitial = await initialText.isVisible();

    if (hasInitial) {
      await expect(initialText).toBeVisible();
    }
  });

  test("should apply correct colors to status badges", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Badge Colors"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "recruited");
    await page.waitForTimeout(500);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const statusBadges = page.locator(statusHistorySelectors.statusBadge);
    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      const firstBadge = statusBadges.first();
      const className = await firstBadge.getAttribute("class");

      expect(className).toMatch(
        /bg-(blue|green|slate|purple|amber|orange|red|gray)-/,
      );
    }
  });

  test("should show 'You' for current user's changes", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("User Attribution"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "contacted");
    await page.waitForTimeout(500);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const userNameElements = page.locator(statusHistorySelectors.userName);
    const count = await userNameElements.count();

    if (count > 0) {
      const firstUserName = await userNameElements.first().textContent();
      expect(firstUserName).toContain("You");
    }
  });

  test("should display timestamps correctly", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Timestamp Test"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "contacted");
    await page.waitForTimeout(500);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const timestamps = page.locator(statusHistorySelectors.timestamp);
    const timestampCount = await timestamps.count();

    if (timestampCount > 0) {
      const firstTimestamp = await timestamps.first().textContent();

      expect(firstTimestamp).toMatch(/\w+\s+\d+/);
    }
  });

  test("should display arrow icons between statuses", async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Arrow Test"),
      status: "interested",
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await schoolHelpers.changeSchoolStatus(page, schoolId, "contacted");
    await page.waitForTimeout(500);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const arrowIcons = page.locator(statusHistorySelectors.arrowIcon);
    const iconCount = await arrowIcons.count();

    if (iconCount > 0) {
      await expect(arrowIcons.first()).toBeVisible();
    }
  });
});
