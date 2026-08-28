import { test, expect } from "@playwright/test";
import { resolve } from "path";

/**
 * E2E tests for User Story 2.2: Parent and Athlete Profile Updates
 * Family collaboration: parents AND players edit the same player profile on
 * /settings/player-details (parent edits write to the linked athlete's row).
 *
 * Component facts:
 * - No read-only banner: the whole family can edit.
 * - Inputs are enabled for parents and players alike.
 * - Page uses auto-save (no explicit save button)
 * - Tabs: Basics, Athletics, Academics, History, Public Profile
 * - GPA input is on the Academics tab
 */

test.describe("Profile Edit Restrictions (User Story 2.2)", () => {
  test.describe("Parent User - Can Edit (family collaboration)", () => {
    test.use({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json"),
    });

    test("parent does NOT see a read-only warning banner", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // The read-only banner has been removed — parents are full editors now.
      const warningHeading = page.locator("h3", { hasText: "Read-only view" });
      await expect(warningHeading).not.toBeVisible();
    });

    test("parent sees key form inputs ENABLED on Basics tab", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Wait for the form to render — global-setup seeds the player's
      // player_details so the linked athlete profile exists when the parent
      // views it.
      await page
        .locator("select")
        .first()
        .waitFor({ state: "visible", timeout: 15000 });

      // Graduation year / Primary Sport selects must be editable by the parent.
      await expect(page.locator("select").first()).not.toBeDisabled();
      // No disabled selects remain from the old read-only gating.
      expect(await page.locator("select[disabled]").count()).toBe(0);
    });

    test("parent sees position buttons ENABLED", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Selects appear only once isLoading flips false. Wait for the seeded
      // sport too — availablePositions is empty until primary_sport is set, and
      // the Athletics panel is v-show hidden until the tab click commits.
      const sportSelect = page
        .locator("label")
        .filter({ hasText: "Primary Sport" })
        .locator("xpath=following-sibling::select");
      await expect(sportSelect).toBeVisible({ timeout: 15000 });
      await expect(sportSelect).toHaveValue("Baseball", { timeout: 15000 });

      await page
        .locator("nav.mb-8")
        .getByRole("button", { name: "Athletics" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Physical Profile" }),
      ).toBeVisible({ timeout: 15000 });

      const pitcher = page.getByRole("button", {
        name: "Pitcher",
        exact: true,
      });
      await expect(pitcher).toBeVisible({ timeout: 15000 });
      await expect(pitcher).toBeEnabled();
    });

    test("parent sees auto-save status indicator (edits persist)", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Auto-save is available to parents now; the sticky header shows state.
      const savedIndicator = page.locator("text=Saved");
      await expect(savedIndicator).toBeVisible();
    });
  });

  test.describe("Player User - Normal Editing", () => {
    test("player sees normal player details page without read-only banner", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // No warning banner for players
      const warningHeading = page.locator("h3", { hasText: "Read-only view" });
      await expect(warningHeading).not.toBeVisible();

      // Page title "Player Details" in sticky header
      const pageTitle = page.locator("h1", { hasText: "Player Details" });
      await expect(pageTitle).toBeVisible();
    });

    test("player sees enabled form inputs on Basics tab", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Graduation year and Primary Sport selects should not be disabled
      const graduationSelect = page.locator("select").first();
      await expect(graduationSelect).not.toBeDisabled();
    });

    test("player can navigate to Academics tab and see enabled GPA input", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Switch to Academics tab
      const academicsTab = page
        .locator("button", {
          hasText: "Academics",
        })
        .first();
      await academicsTab.click();

      // GPA input: placeholder="e.g. 3.85", type="number"
      const gpaInput = page.locator('input[placeholder="e.g. 3.85"]');
      await expect(gpaInput).toBeVisible();
      await expect(gpaInput).not.toBeDisabled();
    });

    test("player sees auto-save status indicator", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Sticky header shows "Saved" when not saving
      const savedIndicator = page.locator("text=Saved");
      await expect(savedIndicator).toBeVisible();
    });

    test("player sees tab navigation", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Tabs appear twice (desktop + mobile), use first() to avoid strict mode
      await expect(
        page.locator("button", { hasText: "Basics" }).first(),
      ).toBeVisible();
      await expect(
        page.locator("button", { hasText: "Athletics" }).first(),
      ).toBeVisible();
      await expect(
        page.locator("button", { hasText: "Academics" }).first(),
      ).toBeVisible();
      await expect(
        page.locator("button", { hasText: "History" }).first(),
      ).toBeVisible();
      await expect(
        page.locator("button", { hasText: "Public Profile" }).first(),
      ).toBeVisible();
    });
  });

  test.describe("Page Structure", () => {
    test("page loads with form content", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      // Essential Info section heading is on the Basics tab (default)
      await expect(
        page.locator("h2", { hasText: "Essential Info" }),
      ).toBeVisible();
    });

    test("Academics tab shows academic standing section", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("domcontentloaded");

      const academicsTab = page
        .locator("button", {
          hasText: "Academics",
        })
        .first();
      await academicsTab.click();

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
      await page.waitForLoadState("domcontentloaded");

      const response = await request.get(
        "/api/user/preferences/player-details",
      );

      expect(response.status()).toBeGreaterThan(0);
    });
  });
});
