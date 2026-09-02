import { test, expect } from "@playwright/test";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
  schoolSelectors,
} from "../fixtures/schools.fixture";

/**
 * Atomic CRUD pilot — one test walks a school through its full lifecycle:
 * create → read → update (status) → delete. Compared to the per-action specs
 * in schools-crud.spec.ts, this gains real contract coverage and leaves no
 * stray rows behind; it gives up isolation (a failure mid-flow hides later
 * steps).
 *
 * Auth: storageState (configured in playwright.config.ts) handles login —
 * no loginViaForm needed in beforeEach.
 *
 * Parallelism: safe with the default 4-worker config because the school
 * name is UUID-suffixed via generateUniqueSchoolName.
 */
test.describe("Schools CRUD — atomic lifecycle", () => {
  test.setTimeout(120_000);

  test("create → read → update status → delete", async ({ page }) => {
    const name = generateUniqueSchoolName("Atomic CRUD");
    const schoolData = createSchoolData({
      name,
      location: "Austin, TX",
      division: "D1",
      status: "researching",
    });

    // 1. CREATE
    const schoolId = await schoolHelpers.createSchool(page, schoolData);
    expect(schoolId).toMatch(/^[a-f0-9-]{36}$/);

    // 2. READ — already on detail page after create
    await expect(page.locator(schoolSelectors.schoolName)).toContainText(name);
    await expect(page.locator(schoolSelectors.schoolLocation)).toContainText(
      "Austin, TX",
    );
    await expect(page.locator(schoolSelectors.schoolDivision)).toContainText(
      "D1",
    );

    // 3. UPDATE — change status via the sidebar SchoolStatusStepper (auto-saves;
    // #412 replaced the old <select> with a clickable stage stepper).
    // Wait for the stepper section to mount before looking for stage buttons.
    await expect(
      page.locator("h3", { hasText: "Recruiting Status" }),
    ).toBeVisible({ timeout: 10000 });

    const contactedStep = page.getByRole("button", {
      name: /Set status to Contacted/,
    });
    await contactedStep.waitFor({ state: "visible" });
    await contactedStep.click();

    // Wait for the optimistic update + Supabase write to land before reloading
    // (Contacted becomes the current stage).
    await expect(
      page.getByRole("button", { name: /Set status to Contacted/ }),
    ).toHaveAttribute("aria-current", "step", { timeout: 10000 });

    // Reload to confirm persistence.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: /Set status to Contacted/ }),
    ).toHaveAttribute("aria-current", "step", { timeout: 10000 });

    // 4. DELETE — sidebar button → confirm dialog → back at /schools
    await page.locator('button:has-text("Delete School")').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();

    await page.waitForURL("/schools");
    await expect(page.locator(`text=${name}`)).toHaveCount(0);
  });
});
