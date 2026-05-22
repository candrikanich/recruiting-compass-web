import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Atomic CRUD pilot #6 — event lifecycle (camps / showcases / visits).
 *
 * Events can attach to a school (optional). We do attach one so school
 * cleanup in afterAll cascades the event away too — keeps the test
 * self-isolated.
 *
 * Lifecycle: create → view (detail h1) → list visibility → edit name
 * via the modal → reload to confirm persistence → delete via native
 * confirm() → verify gone from list.
 *
 * Auth: storageState (player.json). Parallel-safe (UUID-suffixed name).
 */
test.describe("Events CRUD — atomic lifecycle", () => {
  test.setTimeout(90_000);

  let schoolId: string;
  let schoolName: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(60_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      schoolName = generateUniqueSchoolName("Events Atomic School");
      schoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: schoolName }),
      );
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(60_000);
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

  test("create → view → list → edit name → delete an event", async ({
    page,
  }) => {
    test.skip(!schoolId, "beforeAll school setup failed");

    // confirm() is used by Delete on the detail page
    page.on("dialog", (dialog) => dialog.accept());

    const eventName = `Atomic Showcase ${Date.now()}`;
    const updatedName = `${eventName} (updated)`;
    const startDate = new Date().toISOString().slice(0, 10);

    // 1. CREATE — go to /events, click Add Event link, fill form
    await page.goto("/events");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('[data-testid="add-event-button"]').click();
    await page.waitForURL("/events/create");
    await expect(page.getByRole("heading", { name: "Add New Event" })).toBeVisible();

    await page.getByLabel("Event Type", { exact: false }).selectOption("showcase");
    await page.getByLabel("Event Name", { exact: false }).fill(eventName);
    // "School" alone collides with the nav-search link's aria-label;
    // exact match scopes to the form select.
    await page.getByLabel("School", { exact: true }).selectOption(schoolId);
    await page.getByLabel("Start Date", { exact: false }).fill(startDate);
    await page.getByRole("button", { name: "Create Event" }).click();

    // 2. READ — auto-redirects to /events/{id} on success. Strict UUID
    // regex; the looser `[a-f0-9-]+` can match a brief transient URL
    // before the redirect completes.
    await page.waitForURL(
      /\/events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
    const detailUrl = page.url();
    await expect(page.locator("h1").first()).toContainText(eventName);

    // 3. READ — verify it shows up in the /events list
    await page.goto("/events");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: eventName })).toBeVisible();

    // Back to detail page for edit/delete (list cards don't link to detail)
    await page.goto(detailUrl);
    await page.waitForLoadState("domcontentloaded");
    // Wait for the event to actually finish loading — the "not found"
    // state shows briefly while fetchEvent resolves.
    await expect(page.locator("h1").first()).toContainText(eventName);

    // 4. UPDATE — open Edit modal, change name, save
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editModal = page.locator("div").filter({
      has: page.getByRole("heading", { name: "Edit Event" }),
    });
    await expect(
      editModal.getByRole("heading", { name: "Edit Event" }),
    ).toBeVisible();
    await editModal.getByLabel("Event Name", { exact: false }).fill(updatedName);
    await editModal.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      editModal.getByRole("heading", { name: "Edit Event" }),
    ).toBeHidden();

    // 5. Reload — confirm persistence
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1").first()).toContainText(updatedName);

    // 6. DELETE — native confirm(), then redirect to /events
    const beforeDelete = page.url();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.waitForFunction(
      (oldUrl) => window.location.href !== oldUrl,
      beforeDelete,
      { timeout: 10_000 },
    );

    // 7. VERIFY — back at /events, our event is gone from the list
    await page.goto("/events");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: updatedName }),
    ).toHaveCount(0);
  });
});
