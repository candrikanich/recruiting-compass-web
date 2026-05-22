import { test, expect, Browser } from "@playwright/test";
import { resolve } from "path";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Document sharing — share with schools (not users).
 *
 * The original spec was testing a hypothetical user-to-user sharing flow that
 * never existed in this codebase. The real model is: documents attach to a
 * primary school, and the owner may grant view access to additional schools
 * via `shared_with_schools`. UI lives on /documents/[id] (Share Document
 * modal).
 *
 * Setup creates two schools (primary + recipient) and a document on the
 * primary, then tears both down. Tests reuse the same document.
 */
test.describe("Document sharing", () => {
  test.setTimeout(120_000);

  let primarySchoolId: string;
  let recipientSchoolId: string;
  let recipientSchoolName: string;
  let documentId: string;
  const docTitle = `Sharing Doc ${Date.now()}`;

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      primarySchoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: generateUniqueSchoolName("Sharing Primary") }),
      );
      recipientSchoolName = generateUniqueSchoolName("Sharing Recipient");
      recipientSchoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({ name: recipientSchoolName }),
      );

      // Upload one document on the primary school
      await page.goto(`/schools/${primarySchoolId}`);
      await page.waitForLoadState("domcontentloaded");
      await page.getByRole("button", { name: "Upload document" }).click();
      await page.locator("#type").selectOption("transcript");
      await page.locator("#title").fill(docTitle);
      await page.locator("#description").fill("Sharing test doc");
      await page.locator("#file").setInputFiles({
        name: "sharing.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 dummy content"),
      });
      await page.locator('form button[type="submit"]').click();

      // Navigate to the doc detail to capture its id
      await page
        .locator("div", { hasText: docTitle })
        .first()
        .getByRole("link", { name: "View" })
        .click();
      await page.waitForURL(/\/documents\/[a-f0-9-]+/);
      const match = page.url().match(/\/documents\/([a-f0-9-]+)/);
      documentId = match?.[1] ?? "";
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async ({ browser }: { browser: Browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    if (!primarySchoolId && !recipientSchoolId) return;
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      for (const id of [primarySchoolId, recipientSchoolId].filter(Boolean)) {
        await page.goto(`/schools/${id}`);
        await page.waitForLoadState("domcontentloaded");
        const deleteBtn = page.locator('button:has-text("Delete School")');
        if (await deleteBtn.isVisible().catch(() => false)) {
          await deleteBtn.click();
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          await dialog
            .getByRole("button", { name: "Delete", exact: true })
            .click();
          await page.waitForURL("/schools");
        }
      }
    } finally {
      await ctx.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!documentId, "beforeAll setup failed");
    await page.goto(`/documents/${documentId}`);
    await page.waitForLoadState("domcontentloaded");
  });

  test("share modal lists schools as checkboxes", async ({ page }) => {
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const heading = page.locator('h3:has-text("Share Document")');
    await expect(heading).toBeVisible();

    // Recipient school appears in the "Add Schools" checkbox list
    await expect(page.locator(`label:has-text("${recipientSchoolName}")`)).toBeVisible();

    await page.locator('h3:has-text("Share Document")').locator("..").locator('button:has-text("Close")').click();
    await expect(heading).toBeHidden();
  });

  test("share document with a school persists across reload", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const heading = page.locator('h3:has-text("Share Document")');
    await expect(heading).toBeVisible();

    // Check the recipient school
    await page
      .locator(`label:has-text("${recipientSchoolName}")`)
      .locator('input[type="checkbox"]')
      .check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(heading).toBeHidden();

    // Reload and reopen — recipient now in "Shared With" section
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.locator('h4:has-text("Shared With")')).toBeVisible();
    await expect(
      page.locator(`text=${recipientSchoolName}`).first(),
    ).toBeVisible();
  });
});
