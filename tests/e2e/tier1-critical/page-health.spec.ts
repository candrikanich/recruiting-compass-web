import { test, expect } from "@playwright/test";

// @smoke gap fill — auth/CRUD flows are already tagged @smoke elsewhere
// (auth.spec.ts, auth-enforcement.spec.ts, schools-crud-atomic.spec.ts,
// coaches-crud-atomic.spec.ts). This file covers the remaining "did the
// deploy come up broken" surface: do the core pages render with no console
// errors. See planning/testing-strategy-2026-09-22.md.

test.describe("Page health — unauthenticated", () => {
  test.use({ storageState: undefined });

  for (const path of ["/", "/signup"]) {
    test(`${path} renders with no console errors @smoke`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
      expect(errors).toEqual([]);
    });
  }
});

test.describe("Page health — authenticated", () => {
  // storageState defaults to tests/e2e/.auth/player.json (see playwright.config.ts)
  for (const path of ["/dashboard", "/schools", "/tasks", "/performance"]) {
    test(`${path} renders with no console errors @smoke`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
      expect(errors).toEqual([]);
    });
  }
});
