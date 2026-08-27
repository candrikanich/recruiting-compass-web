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
  deleteSchoolDirect,
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
  // fullyParallel can shard this describe's tests across workers, each of
  // which independently re-runs beforeAll -- same race found in
  // family-invite-flow.spec.ts and fixed the same way across this session.
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  let schoolId: string;
  let coachId: string;
  // Full name of the seeded coach — the Quick Communication composer moved off
  // the detail page (where Email is now a mailto: link) onto the directory,
  // where each card's "Email {name}" button opens it; the comm tests target
  // that button by name.
  let coachFullName = "";

  /**
   * Open the Quick Communication dialog from the coach directory for the
   * seeded coach. The composer used to live inline on the detail page; after
   * the coach-detail consolidation it opens from the directory card action.
   */
  async function openQuickComm(page: import("@playwright/test").Page) {
    await page.goto("/coaches");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: `Email ${coachFullName}` })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Quick Communication" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    testInfo.setTimeout(120_000);
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
      coachFullName = `${coachName.firstName} ${coachName.lastName}`;
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("detail"),
        phone: "555-987-6543",
      });
      await coachHelpers.createCoach(page, schoolId, coachData);

      // Capture the coach id from the URL on the detail page
      await page
        .getByRole("link", {
          name: `View profile for ${coachData.firstName} ${coachData.lastName}`,
        })
        .click();
      await page.waitForURL(/\/coaches\/[a-f0-9-]+/);
      const match = page.url().match(/\/coaches\/([a-f0-9-]+)/);
      coachId = match?.[1] ?? "";
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    await deleteSchoolDirect(schoolId);
  });

  test.beforeEach(({ page }) => {
    test.skip(!coachId, "beforeAll coach setup failed");
    return page.goto(`/coaches/${coachId}`);
  });

  test("communication panel opens via Email and closes via close button", async ({
    page,
  }) => {
    const dialog = await openQuickComm(page);

    await dialog
      .getByRole("button", { name: "Close Quick Communication dialog" })
      .click();
    await expect(dialog).toBeHidden();
  });

  test("communication panel closes on Escape", async ({ page }) => {
    const dialog = await openQuickComm(page);

    // The Escape handler lives on the dialog element; opening via the card
    // button leaves focus outside it, so press Escape from a focusable
    // control inside the dialog (as a keyboard user in the modal would).
    await dialog
      .getByRole("button", { name: "Close Quick Communication dialog" })
      .press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("email composer stages compose → (info) → preview + send", async ({
    page,
  }) => {
    // Open the Quick Communication panel, then the email composer drawer.
    await openQuickComm(page);

    const composer = page.getByRole("dialog", { name: /Send Email to/ });
    await page.getByRole("button", { name: "Send Email" }).first().click();
    await expect(composer).toBeVisible();

    // Compose stage: pick the first real template (skip "Custom message").
    const select = composer.locator("select");
    const optionValues = await select
      .locator("option")
      .evaluateAll((opts) =>
        opts
          .map((o) => (o as HTMLOptionElement).value)
          .filter((v) => v !== ""),
      );
    if (optionValues.length > 0) {
      await select.selectOption(optionValues[0]);
    }

    // Continue advances the flow. If the template needs info, the unified step
    // shows first — advance through it — then the preview must appear.
    await composer.getByRole("button", { name: "Continue" }).click();
    const infoHeading = composer.getByText("Complete your info");
    if (await infoHeading.isVisible().catch(() => false)) {
      await composer.getByRole("button", { name: "Continue" }).click();
    }

    // Preview stage: the coach-preview and a Send button are present.
    await expect(
      composer.getByText("Preview — what the coach sees"),
    ).toBeVisible();
    await expect(
      composer.getByRole("button", { name: "Send Email" }),
    ).toBeVisible();
  });

  test("notes editor opens, accepts input, and saves without error", async ({
    page,
  }) => {
    const noteText = `Coach note ${Date.now()}`;
    // Notes are edited through the Edit Coach modal (the Internal Notes card's
    // edit action opens it) rather than an inline editor.
    await page.getByTestId("edit-notes").click();
    const editDialog = page.getByRole("dialog", { name: "Edit Coach" });
    await expect(editDialog).toBeVisible();
    const notesField = editDialog.locator("#notes");
    await expect(notesField).toBeVisible();
    await notesField.fill(noteText);

    // Wait for the PATCH /api/coaches/<id> to land before we trust persistence
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/coaches") &&
          (r.request().method() === "PATCH" || r.request().method() === "PUT"),
        { timeout: 10_000 },
      ),
      editDialog.getByRole("button", { name: "Save Changes" }).click(),
    ]);
    expect(response.status()).toBeLessThan(400);

    // Modal closes after a successful save
    await expect(editDialog).toBeHidden();
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

  test("detail page shows the coach name as its primary heading", async ({
    page,
  }) => {
    // The consolidated detail page renders the coach name in the identity
    // card as a level-2 heading (the page has no coach-name <h1>).
    const heading = page.getByRole("heading", {
      level: 2,
      name: coachFullName,
    });
    await expect(heading).toBeVisible();
  });
});
