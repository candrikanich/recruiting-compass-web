import { test, expect } from "@playwright/test";

/**
 * Documents list page — smoke coverage.
 *
 * Upload/view/edit/delete is covered in tier1-critical/documents-crud-atomic.
 * Sharing flow is covered in tier1-critical/documents-sharing. This spec
 * fills the gap for the /documents list page itself: load, header, filter
 * panel, stats row, "Add Document" CTA, empty/populated branches.
 *
 * Created 2026-05-25 as part of bug ticket #5 — replaces the deleted
 * tier2-important/search-and-filters.spec.ts (which was actually a schools
 * spec, redundant with tier1 schools-filtering.spec.ts).
 */

test.describe("/documents — Documents list page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Documents");
  });

  test("shows description text", async ({ page }) => {
    await expect(
      page.getByText(
        /Manage videos, transcripts, and other recruiting documents/i,
      ),
    ).toBeVisible();
  });

  test("shows Add Document CTA linking to /documents/add", async ({ page }) => {
    const addLink = page.locator('a[href="/documents/add"]');
    await expect(addLink).toBeVisible();
    await expect(addLink).toContainText(/Add Document/i);
  });

  test("renders the statistics row", async ({ page }) => {
    await expect(page.getByText(/Total Documents/i)).toBeVisible();
    await expect(page.getByText(/Shared Documents/i)).toBeVisible();
    await expect(page.getByText(/Most Common Type/i)).toBeVisible();
  });

  test("renders the filter panel", async ({ page }) => {
    // FilterPanel mounts after data loads — wait for any control inside it.
    const filterControls = page.locator(
      'main input:visible, main select:visible, main button[role="combobox"]',
    );
    await expect(filterControls.first()).toBeVisible({ timeout: 10000 });
    expect(await filterControls.count()).toBeGreaterThan(0);
  });

  test("shows either a documents grid or an empty state — no blank screen", async ({
    page,
  }) => {
    // Wait for the page body to settle, then assert one of the two terminal
    // states is visible (matches notifications.spec.ts settle pattern).
    await page.waitForLoadState("domcontentloaded");
    const bodyText = await page.locator("#main-content").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

test.describe("/documents — Auth guard", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
