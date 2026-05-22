import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Atomic CRUD pilot #4 — interaction lifecycle.
 *
 * Interactions are immutable once logged (no UPDATE flow exists in the
 * app), so the atomic is create → read → delete. The test uses the
 * school-attached InteractionAddForm (the most common path users hit;
 * the standalone /interactions/add page is rarely the entry point).
 *
 * Auth: storageState (player.json).
 * Parallel: UUID-suffixed content string scopes per-worker assertions.
 */
test.describe("Interactions CRUD — atomic lifecycle (school-attached)", () => {
  test.setTimeout(90_000);

  let schoolId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      const schoolName = generateUniqueSchoolName("Interactions Atomic School");
      schoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: schoolName }),
      );
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async ({ browser }) => {
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

  test("log → see in list → delete an interaction", async ({ page }) => {
    test.skip(!schoolId, "beforeAll school setup failed");

    const content = `Atomic interaction ${Date.now()}`;
    const now = new Date();
    const occurredAt = `${now.toISOString().slice(0, 10)}T14:30`;

    // 1. LOG — toggle the inline form, fill, submit
    await page.goto(`/schools/${schoolId}/interactions`);
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Log Interaction" }).click();

    const formHeading = page.getByRole("heading", {
      name: "Log New Interaction",
    });
    await expect(formHeading).toBeVisible();

    // Scope all form interactions to the InteractionAddForm card so we
    // don't accidentally hit the filter form or page-header button.
    const addForm = page
      .locator(":has(> h2:text('Log New Interaction'))")
      .locator("form");

    await addForm.locator("#type").selectOption("email");
    await addForm.locator("#direction").selectOption("outbound");
    await addForm.locator("#content").fill(content);
    await addForm.locator("#occurred_at").fill(occurredAt);
    await addForm.locator('button[type="submit"]').click();

    // Form closes on success (showAddForm = false)
    await expect(formHeading).toBeHidden();

    // 2. READ — the new interaction shows in the timeline
    const interactionCard = page.locator("div", { hasText: content }).first();
    await expect(interactionCard).toBeVisible();

    // 3. DELETE — Delete button on the interaction's card → confirm dialog
    await interactionCard.getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete Interaction" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();

    // 4. VERIFY removed from the list
    await expect(page.locator(`text=${content}`)).toHaveCount(0);
  });
});
