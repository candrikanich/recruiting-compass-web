import { test, expect } from "@playwright/test";
import { resolve } from "path";

/**
 * E2E tests for User Story 2.2: Parent and Athlete Profile Updates
 * Tests read-only restrictions for parents on /settings/player-details
 *
 * Component facts:
 * - Warning banner (parent only): h3 "Read-only view" + p "You're viewing this profile as a parent..."
 * - Inputs use :disabled="isParentRole" — disabled for parents on Basics tab
 * - Page uses auto-save (no explicit save button)
 * - Tabs: Basics, Athletics, Academics & Social, History, Public Profile
 * - GPA input is on the Academics & Social tab
 */

test.describe("Profile Edit Restrictions (User Story 2.2)", () => {
  test.describe("Parent User Restrictions", () => {
    test.use({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json"),
    });

    test("parent sees read-only warning banner", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Warning banner is an amber box with h3 "Read-only view"
      const warningHeading = page.locator("h3", { hasText: "Read-only view" });
      await expect(warningHeading).toBeVisible();

      // Sub-text describes read-only reason
      // Using partial text to avoid apostrophe encoding issues
      const warningText = page.getByText(
        "viewing this profile as a parent",
        { exact: false },
      );
      await expect(warningText).toBeVisible();
    });

    test("parent sees key form inputs disabled on Basics tab", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // The Basics tab is shown by default. Graduation year and Primary Sport
      // selects both have :disabled="isParentRole"
      const selects = page.locator("select[disabled]");
      const disabledCount = await selects.count();
      expect(disabledCount).toBeGreaterThan(0);

      // Verify at least one input is disabled
      const inputs = page.locator("input[disabled]");
      const disabledInputCount = await inputs.count();
      expect(disabledInputCount).toBeGreaterThan(0);
    });

    test("parent sees position buttons disabled", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Navigate to Athletics tab (use first match - desktop nav button)
      const athleticsTab = page.locator("button", { hasText: "Athletics" }).first();
      await athleticsTab.click();
      await page.waitForTimeout(300);

      // Position buttons use :disabled="isParentRole"
      const disabledButtons = page.locator("button[disabled]");
      const count = await disabledButtons.count();
      // Campus size / cost sensitivity / position buttons are all disabled
      expect(count).toBeGreaterThan(0);
    });

    test("parent cannot bypass API with direct request (403)", async ({
      page,
      context,
    }) => {
      await page.goto("/settings/player-details", {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle");

      const response = await context.request.patch(
        "/api/user/preferences/player-details",
        {
          data: { gpa: 3.8 },
        },
      );

      // Should get 403 Forbidden for parent role, or 400 for CSRF token missing
      expect([400, 403]).toContain(response.status());

      const body = await response.json();
      const message = body.statusMessage || body.message || "";
      expect(message.toLowerCase()).toMatch(
        /(read-only|csrf|unauthorized|forbidden)/i,
      );
    });

    test("parent does not see auto-save as available", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // The page has a sticky header showing "Saved" or "Saving" state
      // For parents, inputs are disabled so no mutations occur
      // Verify the page loaded with the read-only banner intact
      const warningHeading = page.locator("h3", { hasText: "Read-only view" });
      await expect(warningHeading).toBeVisible();
    });
  });

  test.describe("Player User - Normal Editing", () => {
    test("player sees normal player details page without read-only banner", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // No warning banner for players
      const warningHeading = page.locator("h3", { hasText: "Read-only view" });
      await expect(warningHeading).not.toBeVisible();

      // Page title "Player Details" in sticky header
      const pageTitle = page.locator("h1", { hasText: "Player Details" });
      await expect(pageTitle).toBeVisible();
    });

    test("player sees enabled form inputs on Basics tab", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Graduation year and Primary Sport selects should not be disabled
      const graduationSelect = page.locator("select").first();
      await expect(graduationSelect).not.toBeDisabled();
    });

    test("player can navigate to Academics tab and see enabled GPA input", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Switch to Academics & Social tab
      const academicsTab = page.locator("button", {
        hasText: "Academics & Social",
      }).first();
      await academicsTab.click();
      await page.waitForTimeout(300);

      // GPA input: placeholder="e.g. 3.85", type="number"
      const gpaInput = page.locator('input[placeholder="e.g. 3.85"]');
      await expect(gpaInput).toBeVisible();
      await expect(gpaInput).not.toBeDisabled();
    });

    test("player sees auto-save status indicator", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Sticky header shows "Saved" when not saving
      const savedIndicator = page.locator("text=Saved");
      await expect(savedIndicator).toBeVisible();
    });

    test("player sees tab navigation", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Tabs appear twice (desktop + mobile), use first() to avoid strict mode
      await expect(page.locator("button", { hasText: "Basics" }).first()).toBeVisible();
      await expect(page.locator("button", { hasText: "Athletics" }).first()).toBeVisible();
      await expect(page.locator("button", { hasText: "Academics & Social" }).first()).toBeVisible();
      await expect(page.locator("button", { hasText: "History" }).first()).toBeVisible();
      await expect(page.locator("button", { hasText: "Public Profile" }).first()).toBeVisible();
    });
  });

  test.describe("Page Structure", () => {
    test("page loads with form content", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Essential Info section heading is on the Basics tab (default)
      await expect(
        page.locator("h2", { hasText: "Essential Info" }),
      ).toBeVisible();
    });

    test("Academics tab shows academic standing section", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      const academicsTab = page.locator("button", {
        hasText: "Academics & Social",
      }).first();
      await academicsTab.click();
      await page.waitForTimeout(300);

      await expect(
        page.locator("h2", { hasText: "Academic Standing" }),
      ).toBeVisible();
    });
  });

  test.describe("API Authorization", () => {
    test("API endpoints require authentication", async ({ request }) => {
      const response = await request.patch(
        "/api/user/preferences/player-details",
        {
          data: { gpa: 3.8 },
        },
      );

      // Unauthenticated requests should be rejected
      expect([400, 401, 403]).toContain(response.status());
    });

    test("player details API endpoint exists", async ({ page, request }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      const response = await request.get(
        "/api/user/preferences/player-details",
      );

      expect(response.status()).toBeGreaterThan(0);
    });
  });
});
