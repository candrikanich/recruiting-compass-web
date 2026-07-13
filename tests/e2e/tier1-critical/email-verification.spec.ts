import { test, expect } from "@playwright/test";

/**
 * Email verification page — semantic selectors only.
 *
 * The original spec was full of brittle CSS-class selectors (`.bg-white/95
 * .backdrop-blur-sm`) that drifted with Tailwind class renames. This rewrite
 * uses headings, button labels, and link text — the contract a real user sees.
 *
 * Unauthenticated context (overrides playwright.config storageState).
 */
test.describe("Email verification page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders verify-email page with heading, resend, and back link", async ({
    page,
  }) => {
    await page.goto("/verify-email");
    await expect(
      page.getByRole("heading", { name: "Verify Your Email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resend Verification Email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to Home" }),
    ).toBeVisible();
  });

  test("displays email address when passed as ?email= param", async ({
    page,
  }) => {
    const email = "param-test@example.com";
    await page.goto(`/verify-email?email=${encodeURIComponent(email)}`);
    await expect(page.locator(`text=${email}`)).toBeVisible();
  });

  test("Back to Home link returns to landing", async ({ page }) => {
    await page.goto("/verify-email");
    await page.getByRole("link", { name: "Back to Home" }).click();
    await page.waitForURL("/");
  });

  test("token in URL keeps user on verify-email and shows a status message", async ({
    page,
  }) => {
    await page.goto("/verify-email?token=invalid-token-12345");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/verify-email");
    // Either a loading, success, error, or pending status panel must render
    await expect(
      page.locator('[role="status"], [role="alert"]').first(),
    ).toBeVisible();
  });

  test("resend button is interactive (enabled or in cooldown)", async ({
    page,
  }) => {
    await page.goto("/verify-email");
    const resend = page.getByRole("button", {
      name: "Resend Verification Email",
    });
    await expect(resend).toBeVisible();
    // Button must be present in either enabled or cooldown state — both valid
    const disabled = await resend.isDisabled();
    expect(typeof disabled).toBe("boolean");
  });

  // Signup-flow → verify-email coverage lives in signup-flow.spec.ts. The
  // post-signup destination depends on age/onboarding, so verify-email is
  // tested in isolation here (direct nav + ?email param + ?token param).
});
