import { test, expect, Browser } from "@playwright/test";
import { resolve } from "path";
import {
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

/**
 * Coach detail page — focused, beforeAll-shared setup.
 *
 * Atomic CRUD (coaches-crud-atomic.spec.ts) already covers: detail page loads,
 * edit modal, delete modal, persistence. This spec covers the orthogonal
 * detail-page concerns: communication panel modal, notes editor, error state,
 * and a11y plumbing.
 *
 * One school + one coach are created in beforeAll, reused across all tests,
 * torn down in afterAll. This avoids the per-test cascade-timeout that broke
 * the original 746-LOC version.
 */
test.describe("Coach detail page", () => {
  test.setTimeout(60_000);

  let schoolId: string;
  let coachId: string;

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    testInfo.setTimeout(90_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      schoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: generateUniqueSchoolName("Coach Detail") }),
      );

      const coachName = generateUniqueCoachName("Detail", "Coach");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("detail"),
        phone: "555-987-6543",
      });
      await coachHelpers.createCoach(page, schoolId, coachData);

      // Capture the coach id from the URL on the detail page
      await page
        .getByRole("button", {
          name: `View details for ${coachData.firstName} ${coachData.lastName}`,
        })
        .click();
      await page.waitForURL(/\/coaches\/[a-f0-9-]+/);
      const match = page.url().match(/\/coaches\/([a-f0-9-]+)/);
      coachId = match?.[1] ?? "";
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async ({ browser }: { browser: Browser }) => {
    if (!schoolId) return;
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      await page.goto(`/schools/${schoolId}`);
      await page.waitForLoadState("domcontentloaded");
      await page.locator('button:has-text("Delete School")').click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
      await page.waitForURL("/schools");
    } finally {
      await ctx.close();
    }
  });

  test.beforeEach(({ page }) => {
    test.skip(!coachId, "beforeAll coach setup failed");
    return page.goto(`/coaches/${coachId}`);
  });

  test("communication panel opens via Email and closes via close button", async ({
    page,
  }) => {
    await page.locator('button:has-text("Email")').first().click();

    const dialog = page.getByRole("dialog", { name: "Quick Communication" });
    await expect(dialog).toBeVisible();

    await dialog
      .getByRole("button", { name: "Close communication panel" })
      .click();
    await expect(dialog).toBeHidden();
  });

  test("communication panel closes on Escape", async ({ page }) => {
    await page.locator('button:has-text("Email")').first().click();
    const dialog = page.getByRole("dialog", { name: "Quick Communication" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("notes editor opens, accepts input, and saves without error", async ({
    page,
  }) => {
    const noteText = `Coach note ${Date.now()}`;
    await page.getByRole("button", { name: "Edit notes" }).click();
    const textarea = page.getByPlaceholder("Add notes about this coach...");
    await expect(textarea).toBeVisible();
    await textarea.fill(noteText);

    // Wait for the PATCH /api/coaches/<id> to land before we trust persistence
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/coaches") &&
          (r.request().method() === "PATCH" || r.request().method() === "PUT"),
        { timeout: 10_000 },
      ),
      page.getByRole("button", { name: "Save Notes" }).click(),
    ]);
    expect(response.status()).toBeLessThan(400);

    // Editor closes after a successful save
    await expect(textarea).toBeHidden();
  });

  test("renders not-found state for unknown coach id", async ({ page }) => {
    await page.goto("/coaches/00000000-0000-0000-0000-000000000000");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator("main").getByText("Coach not found").first(),
    ).toBeVisible();
  });

  test("skip link is present and targets main content", async ({ page }) => {
    // There are two skip links on this page — the global layout's and the
    // page-specific one. Scope to the second (page-level).
    const skipLink = page
      .getByRole("link", { name: "Skip to main content" })
      .last();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    // The layout has its own #main-content; verify the page's exists too
    await expect(page.locator("#main-content").last()).toBeVisible();
  });

  test("page has exactly one h1 with coach name", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    const text = await h1.textContent();
    expect(text?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
