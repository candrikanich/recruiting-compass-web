import { test, expect } from "@playwright/test";

/**
 * Settings — Sub-route Coverage
 *
 * The settings surface is split across `/settings` + 10 sub-routes. This
 * spec mirrors the medium-priority-pages.spec.ts pattern: one describe per
 * route, smoke-level assertions (loads, heading visible, key content
 * present, no blank screen). Form-save and validation flows are out of
 * scope here — they live in their dedicated specs (player-details-autosave,
 * family-invite-flow, etc.).
 *
 * Replaces the deleted Phase-2 settings spec (22 tests, 22 fails, fully
 * stale POM). Tracked in planning/2026-05-22-skipped-tests-bug-tickets.md
 * (ticket #4).
 *
 * Run sequentially — settings sub-pages all hit user_preferences API and
 * can collide under heavy parallel load.
 */
// @ts-ignore — fullyParallel override for this file
test.describe.configure({ mode: "serial" });

// ── /settings — Dashboard / Nav Hub ────────────────────────────────────────

test.describe("/settings — Settings hub", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(
      page.locator("h1, h2").filter({ hasText: "Settings" }).first(),
    ).toBeVisible();
  });

  test("shows all sub-route navigation cards", async ({ page }) => {
    const routes = [
      "/settings/location",
      "/settings/player-details",
      "/settings/school-preferences",
      "/settings/dashboard",
      "/settings/notifications",
      "/settings/communication-templates",
      "/settings/social-sync",
      "/settings/family-management",
      "/settings/profile",
    ];
    for (const route of routes) {
      await expect(page.locator(`a[href="${route}"]`)).toBeVisible();
    }
  });

  test("nav card click navigates to sub-route", async ({ page }) => {
    await page.locator('a[href="/settings/profile"]').click();
    await page.waitForURL(/\/settings\/profile/);
    expect(page.url()).toContain("/settings/profile");
  });
});

// ── /settings/profile ──────────────────────────────────────────────────────

test.describe("/settings/profile — My Profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/profile");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("My Profile");
  });

  test("renders form inputs after hydration", async ({ page }) => {
    // First <input> is the hidden avatar file picker (display:none) — filter
    // to :visible so we latch onto a real form control.
    const inputs = page.locator(
      "input:visible, textarea:visible, select:visible",
    );
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

// ── /settings/player-details ───────────────────────────────────────────────

test.describe("/settings/player-details — Player Details", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/player-details");
    await page.waitForLoadState("domcontentloaded");
    await page
      .locator("select")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
  });

  test("loads and shows heading", async ({ page }) => {
    // h1 resolves to 2 elements (sticky header + main title) — scope by text.
    await expect(
      page.locator("h1", { hasText: "Player Details" }).first(),
    ).toBeVisible();
  });

  test("shows tab navigation", async ({ page }) => {
    // Tabs render twice (desktop + mobile) — use .first().
    await expect(page.locator("text=Athletics").first()).toBeVisible();
    await expect(page.locator("text=Academics & Social").first()).toBeVisible();
  });
});

// ── /settings/notifications ────────────────────────────────────────────────

test.describe("/settings/notifications — Notification Preferences", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Notification Preferences");
  });

  test("shows back link to settings", async ({ page }) => {
    await expect(page.locator("a:has-text('Back to Settings')")).toBeVisible();
  });

  test("renders toggleable preferences", async ({ page }) => {
    // Notification prefs are checkboxes/switches — wait for any input to mount.
    const toggles = page.locator(
      'input[type="checkbox"], button[role="switch"]',
    );
    await expect(toggles.first()).toBeVisible({ timeout: 10000 });
    expect(await toggles.count()).toBeGreaterThan(0);
  });
});

// ── /settings/location ─────────────────────────────────────────────────────

test.describe("/settings/location — Home Location", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/location");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Home Location");
  });

  test("renders address inputs", async ({ page }) => {
    const inputs = page.locator("input:visible");
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

// ── /settings/school-preferences ───────────────────────────────────────────

test.describe("/settings/school-preferences — School Preferences", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/school-preferences");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("School Preferences");
  });

  test("renders content after data load", async ({ page }) => {
    // Page shows a loading skeleton (isLoading) before preferences fetch
    // settles — wait for any heading or button beyond the page <h1> to mount.
    const content = page.locator("button:visible, select:visible, h2:visible");
    await expect(content.first()).toBeVisible({ timeout: 15000 });
    expect(await content.count()).toBeGreaterThan(0);
  });
});

// ── /settings/dashboard — Dashboard customization ──────────────────────────

test.describe("/settings/dashboard — Dashboard Customization", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/dashboard");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Dashboard Customization");
  });

  test("renders meaningful content", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

// ── /settings/communication-templates ──────────────────────────────────────

test.describe("/settings/communication-templates — Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/communication-templates");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Communication Templates");
  });

  test("renders meaningful content", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

// ── /settings/social-sync ──────────────────────────────────────────────────

test.describe("/settings/social-sync — Social Media Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/social-sync");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Social Media Sync");
  });

  test("renders meaningful content", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

// ── /settings/family-management ────────────────────────────────────────────

test.describe("/settings/family-management — Family Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/family-management");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Family Management");
  });

  test("renders meaningful content", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

// ── /settings/account ──────────────────────────────────────────────────────

test.describe("/settings/account — Account (redirect-only)", () => {
  test("redirects to /settings/profile on mount", async ({ page }) => {
    // account.vue exists as a route but its onMounted does
    // router.replace("/settings/profile") — kept for backwards-compat with
    // any saved links/bookmarks.
    await page.goto("/settings/account");
    await page.waitForURL(/\/settings\/profile/, { timeout: 10000 });
    expect(page.url()).toContain("/settings/profile");
  });
});

// ── Protected route guard ──────────────────────────────────────────────────

test.describe("/settings — Auth guard", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
