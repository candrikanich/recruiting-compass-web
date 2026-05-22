import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Atomic CRUD pilot #5 — offer lifecycle.
 *
 * Offers attach to a school. beforeAll/afterAll manage the parent
 * school; the test walks one offer through log → view → change status
 * to "accepted" → reload to confirm persistence → delete via native
 * confirm() dialog.
 *
 * Auth: storageState (player.json).
 * Parallel: UUID-suffixed school name keeps list assertions safe.
 */
test.describe("Offers CRUD — atomic lifecycle", () => {
  test.setTimeout(120_000);

  let schoolId: string;
  let schoolName: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      // "0 " prefix sorts before letters — the player has accumulated 1000+
      // test schools and the offers dropdown is capped at Supabase's default
      // 1000-row limit, so a mid-alphabet name gets buried.
      schoolName = generateUniqueSchoolName("0 Offers Atomic");
      schoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: schoolName }),
      );
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
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

  test("log → view → accept (update status) → delete an offer", async ({
    page,
  }) => {
    test.skip(!schoolId, "beforeAll school setup failed");

    // Auto-accept native confirm() used by Delete
    page.on("dialog", (dialog) => dialog.accept());

    const today = new Date().toISOString().slice(0, 10);

    // 1. LOG — toggle the inline form, fill, submit
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('[data-testid="log-offer-button"]').click();

    const formHeading = page.getByRole("heading", { name: "Log New Offer" });
    await expect(formHeading).toBeVisible();

    // /offers has exactly one <form> (the add-offer form). Labels aren't
    // bound via for=, so we locate selects by their distinguishing options.
    const addForm = page.locator("form");

    // Wait for our school to appear in the dropdown (schools load async)
    await expect(
      page.locator(`option:text-is("${schoolName}")`),
    ).toBeAttached({ timeout: 10_000 });

    await addForm
      .locator("select")
      .filter({ has: page.locator(`option:text-is("${schoolName}")`) })
      .selectOption(schoolId);
    await addForm
      .locator("select")
      .filter({ has: page.locator('option[value="full_ride"]') })
      .selectOption("full_ride");
    await addForm.locator('input[type="date"]').first().fill(today);
    await addForm.locator('button[type="submit"]').click();

    await expect(formHeading).toBeHidden();

    // 2. READ — find our specific offer card (each card is a top-level
    // .bg-white.rounded-xl wrapper inside the offers grid)
    const offerCard = page
      .locator("div.bg-white.rounded-xl")
      .filter({ has: page.locator(`h3:text-is("${schoolName}")`) });
    await expect(offerCard).toBeVisible();

    // 3. READ — click View on THAT card to open the detail page
    await offerCard.getByRole("link", { name: "View" }).click();
    await page.waitForURL(/\/offers\/[a-f0-9-]+/);
    await expect(page.locator(`text=${schoolName}`)).toBeVisible();

    // 4. UPDATE — open Edit, change status to accepted, save
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator("#status").selectOption("accepted");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.locator("#status")).toBeHidden();

    // 5. Reload — confirm persistence
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Accepted").first()).toBeVisible();

    // 6. DELETE — native confirm(), then redirect to /offers
    const docDetailUrl = page.url();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.waitForFunction(
      (oldUrl) => window.location.href !== oldUrl,
      docDetailUrl,
      { timeout: 10_000 },
    );

    // 7. VERIFY — back on /offers, our school's offer is gone
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator(`text=${schoolName}`),
    ).toHaveCount(0);
  });
});
