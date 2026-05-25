import { test, expect } from "@playwright/test";

/**
 * /analytics — Smoke coverage.
 *
 * Replaces the deleted Phase-2 monolithic spec (266 lines, 22 fails, stale
 * POM). Mirrors the medium-priority-pages / settings rewrite pattern: per-
 * surface smoke assertions instead of selector-deep flows. Chart correctness
 * and CSV/Excel/PDF export content are out of scope here — those need
 * fixture-driven unit tests, not E2E.
 *
 * Tracked in planning/2026-05-22-skipped-tests-bug-tickets.md (ticket #2).
 *
 * Run sequentially: analytics fetches aggregated data and parallel runs can
 * trip Supabase rate limits.
 */
// @ts-ignore — fullyParallel override
test.describe.configure({ mode: "serial" });

test.describe("/analytics — Analytics dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Analytics");
  });

  test("shows description text", async ({ page }) => {
    await expect(
      page.getByText(
        /Comprehensive recruiting metrics and performance insights/i,
      ),
    ).toBeVisible();
  });

  test("renders the date range toolbar", async ({ page }) => {
    await expect(
      page.locator('[data-testid="date-range-preset"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="clear-date-range-button"]'),
    ).toBeVisible();
  });

  test("date range preset offers the expected options", async ({ page }) => {
    const select = page.locator('[data-testid="date-range-preset"]');
    await expect(select).toBeVisible();
    const options = await select.locator("option").allTextContents();
    expect(options.join("|")).toMatch(
      /Last 7 Days[\s\S]*Last 30 Days[\s\S]*All Time/,
    );
  });

  test("changing date range preset does not crash the page", async ({
    page,
  }) => {
    const select = page.locator('[data-testid="date-range-preset"]');
    await select.selectOption("last_7_days");
    await expect(page.locator("h1")).toContainText("Analytics");
    await select.selectOption("all_time");
    await expect(page.locator("h1")).toContainText("Analytics");
  });

  test("renders all 4 summary stat cards", async ({ page }) => {
    await expect(page.getByText("Total Schools").first()).toBeVisible();
    await expect(page.getByText("Total Interactions").first()).toBeVisible();
    await expect(page.getByText("Offer Count").first()).toBeVisible();
    await expect(page.getByText("Commitments").first()).toBeVisible();
  });

  test("renders all 5 chart titles", async ({ page }) => {
    await expect(page.getByText("Interaction Types").first()).toBeVisible();
    await expect(page.getByText("Sentiment Breakdown").first()).toBeVisible();
    await expect(page.getByText("School Status").first()).toBeVisible();
    await expect(page.getByText("Recruiting Pipeline").first()).toBeVisible();
    await expect(
      page.getByText("Performance Correlation Analysis").first(),
    ).toBeVisible();
  });

  test("renders all 3 export buttons", async ({ page }) => {
    await expect(
      page.locator('[data-testid="export-csv-button"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="export-excel-button"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="export-pdf-button"]'),
    ).toBeVisible();
  });

  test("shows the Export Analytics section heading", async ({ page }) => {
    await expect(
      page.locator("h3", { hasText: "Export Analytics" }),
    ).toBeVisible();
  });
});

test.describe("/analytics — Auth guard", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
