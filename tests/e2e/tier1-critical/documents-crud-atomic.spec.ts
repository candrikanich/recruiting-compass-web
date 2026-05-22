import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Atomic CRUD pilot #3 — document lifecycle on a school.
 *
 * Documents attach to a parent school, so beforeAll creates one and
 * afterAll tears it down. The test exercises: upload (DocumentUploadModal)
 * → list (SchoolDocumentsCard) → view detail (/documents/[id]) → edit
 * title → reload to confirm persistence → delete via native confirm()
 * → verify redirect away from the document.
 *
 * Auth: storageState (player.json) via playwright.config.
 * Parallel: UUID-suffixed school name + document title keep workers safe.
 */
test.describe("Documents CRUD — atomic lifecycle (school-attached)", () => {
  test.setTimeout(90_000);

  let schoolId: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(60_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      const schoolName = generateUniqueSchoolName("Documents Atomic School");
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

  test("upload → view → edit title → delete a document", async ({ page }) => {
    test.skip(!schoolId, "beforeAll school setup failed");

    // Auto-accept the native confirm dialog used by Delete (window.confirm)
    page.on("dialog", (dialog) => dialog.accept());

    const title = `Atomic Doc ${Date.now()}`;
    const updatedTitle = `${title} (updated)`;

    // 1. UPLOAD — open modal, fill, submit
    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Upload document" }).click();

    const uploadModalHeading = page.getByRole("heading", {
      name: "Upload Document",
    });
    await expect(uploadModalHeading).toBeVisible();

    await page.locator("#type").selectOption("transcript");
    await page.locator("#title").fill(title);
    await page.locator("#description").fill("Atomic test transcript");
    await page.locator("#file").setInputFiles({
      name: "atomic-transcript.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 dummy content"),
    });

    // Modal "Upload" submit button (distinct from the card-level one)
    await page.locator('form button[type="submit"]').click();
    await expect(uploadModalHeading).toBeHidden();

    // 2. READ — document appears in SchoolDocumentsCard
    const docRow = page.locator("div", { hasText: title }).first();
    await expect(page.locator(`text=${title}`)).toBeVisible();

    // 3. READ — click View to open detail page
    await docRow.getByRole("link", { name: "View" }).click();
    await page.waitForURL(/\/documents\/[a-f0-9-]+/);
    await expect(page.locator("h1, h2").first()).toContainText(title);

    // 4. UPDATE — open edit form, change title, save
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator("#title").fill(updatedTitle);
    await page.getByRole("button", { name: "Save Changes" }).click();

    // The edit form unmounts (isEditing flips to false) only after the
    // PATCH resolves — waiting for it ensures the write completed before
    // we reload.
    await expect(page.locator("#title")).toBeHidden();

    // 5. Reload — confirm persistence
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1, h2").first()).toContainText(updatedTitle);

    // 6. DELETE — confirm() handler is registered at the top of the test
    const docDetailUrl = page.url();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Wait for navigation off the document detail page (router.push("/documents"))
    await page.waitForFunction(
      (oldUrl) => window.location.href !== oldUrl,
      docDetailUrl,
      { timeout: 10_000 },
    );

    // 7. VERIFY removed from the school's documents
    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(`text=${updatedTitle}`)).toHaveCount(0);
  });
});
