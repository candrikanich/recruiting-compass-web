import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  coachSelectors,
  coachHelpers,
  generateUniqueCoachEmail,
  generateUniqueCoachName,
} from "../fixtures/coaches.fixture";
import {
  createSchoolData,
  deleteSchoolDirect,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Atomic CRUD pilot #2 — coach lifecycle.
 *
 * Coaches require a parent school, so beforeAll creates one and afterAll
 * tears it down (avoids stray rows in Supabase). The test itself owns the
 * full coach lifecycle: create → read (list + detail) → update name →
 * verify persistence across reload → delete.
 *
 * Auth: storageState (player.json) via playwright.config — no loginViaForm.
 * Parallel: UUID-suffixed school name + coach email/name make it safe.
 */
test.describe("Coaches CRUD — atomic lifecycle", () => {
  test.setTimeout(120_000);

  let schoolId: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      const schoolName = generateUniqueSchoolName("Coaches Atomic School");
      schoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: schoolName }),
      );
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    await deleteSchoolDirect(schoolId);
  });

  test("create → read → update → delete a coach", async ({ page }) => {
    test.skip(!schoolId, "beforeAll school setup failed");

    const { firstName, lastName } = generateUniqueCoachName("Atomic", "Coach");
    const email = generateUniqueCoachEmail("atomic");
    const updatedFirstName = `${firstName}-Updated`;

    // 1. CREATE — open inline coach form, fill, save
    await coachHelpers.navigateToCoaches(page, schoolId);
    await page.click(coachSelectors.addCoachButton);
    await page.waitForSelector('h2:has-text("Add New Coach")', {
      timeout: 5000,
    });
    await coachHelpers.fillCoachForm(page, {
      firstName,
      lastName,
      role: "head",
      email,
      phone: "555-123-4567",
    });
    await page.click(coachSelectors.saveCoachButton);
    // Wait for the inline form to close (back to the coaches list view)
    await page
      .locator('h2:has-text("Add New Coach")')
      .waitFor({ state: "detached", timeout: 10_000 });

    // 2. READ — coach name appears in the list as an h3
    const coachHeading = page.getByRole("heading", {
      level: 3,
      name: `${firstName} ${lastName}`,
    });
    await expect(coachHeading).toBeVisible();

    // 3. READ — click "View details for {name}" button to open detail page
    await page
      .getByRole("button", {
        name: `View details for ${firstName} ${lastName}`,
      })
      .click();
    await page.waitForURL(/\/coaches\/[a-f0-9-]+/);
    await expect(page.locator("h1").first()).toContainText(firstName);
    await expect(page.locator(`text=${email}`)).toBeVisible();

    // 4. UPDATE — open Edit Coach modal, change first name, save
    await page.getByRole("button", { name: "Edit coach information" }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit Coach" });
    await expect(editDialog).toBeVisible();
    await editDialog.locator("#firstName").fill(updatedFirstName);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(editDialog).toBeHidden();

    // 5. Reload — confirm persistence (mirrors the schools pilot)
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1").first()).toContainText(updatedFirstName);

    // 6. DELETE — open confirm dialog (alertdialog role), click "Delete"
    await page
      .getByRole("button", { name: "Delete this coach permanently" })
      .click();
    const deleteDialog = page.getByRole("alertdialog");
    await expect(deleteDialog).toBeVisible();
    await deleteDialog
      .getByRole("button", { name: "Confirm permanent deletion" })
      .click();
    await page.waitForLoadState("domcontentloaded");

    // 7. VERIFY removed from list
    await coachHelpers.navigateToCoaches(page, schoolId);
    await expect(
      page.locator(`text=${updatedFirstName} ${lastName}`),
    ).toHaveCount(0);
  });
});
