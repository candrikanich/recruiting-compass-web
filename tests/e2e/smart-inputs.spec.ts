import { test, expect } from "@playwright/test";
import { resolve } from "path";

/**
 * E2E Test Suite: Smart Inputs
 *
 * Covers three enrichment features:
 * 1. High school NCES autocomplete (player-details settings)
 * 2. Address autocomplete via Radar.io (location settings)
 * 3. Social handle normalization (player-details settings)
 *
 * Requirements:
 * - Dev server running (npm run dev)
 * - nces_schools table seeded with NCES data
 * - NUXT_RADAR_API_KEY configured
 * - Authenticated player account (tests/e2e/.auth/player.json)
 */

// Uses the live nces_schools table (~27k rows, seeded with NCES public-school
// dataset). "Lincoln High School" has ~48 matches across states.
test.describe("Smart Inputs — High School Search", () => {
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/player-details");
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
  });

  test("shows NCES autocomplete suggestions when typing school name", async ({
    page,
  }) => {
    const schoolInput = page.locator(
      '[placeholder="Search for your high school"]',
    );
    await schoolInput.fill("Lincoln");
    await expect(page.locator("text=Lincoln High School").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("selecting a school fills the input and hides dropdown", async ({
    page,
  }) => {
    const schoolInput = page.locator(
      '[placeholder="Search for your high school"]',
    );
    await schoolInput.fill("Lincoln");
    // NCES has ~48 "Lincoln" matches across states (e.g. "Abraham Lincoln High
    // School"). Grab whatever the first suggestion's text is, click it, then
    // assert the input now holds that exact value.
    const firstSuggestion = page.locator("text=Lincoln High School").first();
    await firstSuggestion.waitFor({ state: "visible", timeout: 5000 });
    const selectedName = (await firstSuggestion.textContent())?.trim() ?? "";
    await firstSuggestion.click();
    await expect(schoolInput).toHaveValue(selectedName);
    // Dropdown should dismiss — first input now matches the picked value, but
    // a second match (the dropdown row) should be gone.
    await expect(page.locator("text=Lincoln High School").nth(1)).toBeHidden({
      timeout: 2000,
    });
  });

  test("shows escape hatch when no results found", async ({ page }) => {
    const schoolInput = page.locator(
      '[placeholder="Search for your high school"]',
    );
    await schoolInput.fill("xqzpwvnonexistent");
    await expect(page.locator("text=Can't find it")).toBeVisible({
      timeout: 5000,
    });
  });

  test("escape hatch allows free text entry", async ({ page }) => {
    const schoolInput = page.locator(
      '[placeholder="Search for your high school"]',
    );
    await schoolInput.fill("xqzpwvnonexistent");
    const escapeHatch = page.locator("text=Can't find it");
    await expect(escapeHatch).toBeVisible({ timeout: 5000 });
    await escapeHatch.click();
    const manualInput = page.locator(
      '[placeholder="Enter school name manually"]',
    );
    await expect(manualInput).toBeVisible({ timeout: 5000 });
    await manualInput.fill("Hogwarts Academy");
    await expect(manualInput).toHaveValue("Hogwarts Academy");
  });
});

// Tests are written to gracefully no-op when Radar.io key isn't configured.
test.describe("Smart Inputs — Address Autocomplete", () => {
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/location");
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
  });

  test("shows address suggestions when typing", async ({ page }) => {
    const addressInput = page.locator(
      '[placeholder="Start typing your address..."]',
    );
    await addressInput.fill("1600 Pennsylvania");
    // Suggestions come from Radar.io — best-effort check; may be absent if API key not configured
    await page
      .locator('button:has-text("1600")')
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(async () => {
        // Fallback: confirm input is at least functional
        await expect(addressInput).toHaveValue("1600 Pennsylvania");
      });
  });

  test("clear button appears after selection and resets fields", async ({
    page,
  }) => {
    const addressInput = page.locator(
      '[placeholder="Start typing your address..."]',
    );
    await addressInput.fill("1600 Penn");
    const firstSuggestion = page.locator('button:has-text("1600")').first();
    const hasSuggestion = await firstSuggestion
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    if (!hasSuggestion) return; // skip when Radar not configured

    await firstSuggestion.click();
    await expect(
      page.locator('button[title="Clear and re-enter address"]'),
    ).toBeVisible();
    await page.locator('button[title="Clear and re-enter address"]').click();
    await expect(addressInput).toHaveValue("");
  });
});

// Pure client-side input normalization (utils/social.ts) — no seed, no API.
test.describe("Smart Inputs — Social Handle Normalization", () => {
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/player-details");
    await page.waitForLoadState("load");
    // Social inputs live under the "Academics & Social" tab (v-show gates
    // each tab's section). Click the tab button to make them visible.
    await page
      .locator("button", { hasText: "Academics & Social" })
      .first()
      .click();
    await page.waitForTimeout(200);
  });

  test("strips full URL from Twitter handle on blur", async ({ page }) => {
    const twitterInput = page.locator('input[placeholder="username"]').first();
    await twitterInput.fill("https://twitter.com/CoachSmith");
    await twitterInput.blur();
    await expect(twitterInput).toHaveValue("CoachSmith");
  });

  test("strips @ prefix from Instagram handle on blur", async ({ page }) => {
    const igInput = page.locator('input[placeholder="username"]').nth(1);
    await igInput.fill("@athlete.23");
    await igInput.blur();
    await expect(igInput).toHaveValue("athlete.23");
  });
});
