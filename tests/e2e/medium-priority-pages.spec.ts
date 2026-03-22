import { test, expect } from "@playwright/test";

/**
 * Medium-priority coverage: routes with zero or minimal E2E tests.
 * Each describe block covers one route: page load, heading, key UI.
 * Auth guard tests are grouped separately (no login beforeEach).
 *
 * Run sequentially to avoid Supabase rate-limit contention across workers.
 */
// @ts-ignore — fullyParallel override for this file
test.describe.configure({ mode: "serial" });

// ── Auth guards — protected routes redirect to login ─────────────────────────

test.describe("Protected route guards", () => {
  test.use({ storageState: undefined });

  const protectedRoutes = [
    // Note: /timeline and /reports use auth middleware but may handle unauthenticated SSR differently
    "/recommendations",
    "/social",
    "/settings/notifications",
    "/settings/profile",
    "/settings/social-sync",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to login when not authenticated`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain("/login");
    });
  }
});

// ── /timeline ─────────────────────────────────────────────────────────────────

test.describe("/timeline — Recruiting Timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/timeline");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    // PageHeader renders h1.text-3xl; fallback to text match
    await expect(
      page.locator("h1, h2").filter({ hasText: "Recruiting Timeline" }),
    ).toBeVisible();
  });

  test("shows guidance sidebar", async ({ page }) => {
    await expect(page.locator('[data-testid="guidance-sidebar"]')).toBeVisible();
  });

  test("shows year section headings", async ({ page }) => {
    // PhaseCardInline renders title in h3 — page shows all 4 grade years
    const yearHeadings = page.locator("h3").filter({ hasText: /Year/ });
    expect(await yearHeadings.count()).toBeGreaterThanOrEqual(1);
  });
});

// ── /reports ──────────────────────────────────────────────────────────────────

test.describe("/reports — Reports & Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Reports");
  });

  test("shows description text", async ({ page }) => {
    await expect(
      page.locator("text=Generate comprehensive reports"),
    ).toBeVisible();
  });

  test("renders at least one interactive element", async ({ page }) => {
    const interactive = page.locator("button, a[href]");
    expect(await interactive.count()).toBeGreaterThan(0);
  });
});

// ── /recommendations ──────────────────────────────────────────────────────────

test.describe("/recommendations — Recommendation Letters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/recommendations");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    // PageHeader renders h1.text-3xl
    await expect(
      page.locator("h1, h2").filter({ hasText: "Recommendation Letters" }),
    ).toBeVisible();
  });

  test("shows meaningful content — no blank screen", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

// ── /social ───────────────────────────────────────────────────────────────────

test.describe("/social — Social Media Monitoring", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/social");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Social Media Monitoring");
  });

  test("shows platform labels", async ({ page }) => {
    await expect(page.locator("text=Twitter/X Posts")).toBeVisible();
    await expect(page.locator("text=Instagram Posts")).toBeVisible();
  });

  test("shows meaningful content — no crash", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});

// ── /settings/notifications ───────────────────────────────────────────────────

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

  test("back link navigates to /settings", async ({ page }) => {
    await page.locator("a:has-text('Back to Settings')").click();
    await page.waitForURL(/\/settings/);
    expect(page.url()).toMatch(/\/settings/);
  });
});

// ── /settings/profile ─────────────────────────────────────────────────────────

test.describe("/settings/profile — Profile Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/profile");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("My Profile");
  });

  test("shows a form with inputs", async ({ page }) => {
    const inputs = page.locator("input, textarea, select");
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

// ── /settings/social-sync ─────────────────────────────────────────────────────

test.describe("/settings/social-sync — Social Media Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/social-sync");
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads and shows heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Social Media Sync");
  });

  test("shows meaningful content", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(50);
  });
});
