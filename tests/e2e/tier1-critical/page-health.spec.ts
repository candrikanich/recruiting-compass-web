import { test, expect } from "@playwright/test";

// @smoke gap fill — auth/CRUD flows are already tagged @smoke elsewhere
// (auth.spec.ts, auth-enforcement.spec.ts, schools-crud-atomic.spec.ts,
// coaches-crud-atomic.spec.ts). This file covers the remaining "did the
// deploy come up broken" surface: do the core pages render with no console
// errors. See planning/testing-strategy-2026-09-22.md.
//
// Asserts final URL (not just navigation status) — a session-expired or
// onboarding redirect to /login would otherwise satisfy every other
// assertion here while never rendering the requested page. Also waits for
// "networkidle" before reading collected console errors — mounted data
// fetches (schools/tasks/performance widgets) can still be in flight right
// after DOMContentLoaded, and a late console.error from a failed fetch must
// not slip past the check just because it landed after the read.

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
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`${path}$`));
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
      await page.waitForLoadState("networkidle");
      // Proves the requested protected page actually rendered rather than an
      // expired session or onboarding gate silently redirecting elsewhere.
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator("body")).not.toBeEmpty();
      expect(errors).toEqual([]);
    });
  }
});
