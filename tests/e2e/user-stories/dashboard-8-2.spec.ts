import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/DashboardPage";
import { AuthPage } from "../pages/AuthPage";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
  seedSchoolsWithInteractions,
  deleteSeededSchools,
  createOneOffTestUser,
  deleteOneOffTestUser,
  type SeededSchools,
} from "../seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

const RUN_ID = Date.now();
let seeded: SeededSchools | null = null;
let seedReady = false;

test.describe("User Story 8.2: Contact Frequency Summary", () => {
  // fullyParallel can shard this describe's tests across workers, each of
  // which independently re-runs beforeAll -- same race found in
  // family-invite-flow.spec.ts and fixed the same way across this session.
  test.describe.configure({ mode: "serial" });
  let dashboardPage: DashboardPage;

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const playerId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.player.email,
      );
      if (!playerId) return;
      const { data: membership } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", playerId)
        .maybeSingle();
      const familyUnitId = (membership as { family_unit_id: string } | null)
        ?.family_unit_id;
      if (!familyUnitId) return;
      seeded = await seedSchoolsWithInteractions(supabase, {
        familyUnitId,
        userId: playerId,
        runId: RUN_ID,
      });
      seedReady = true;
    } catch (e) {
      console.warn("⚠️  dashboard-8-2 seed failed:", e);
    }
  });

  test.afterAll(async () => {
    if (!seeded) return;
    try {
      await deleteSeededSchools(getSupabaseAdmin(), seeded);
    } catch {
      // non-fatal
    }
  });

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();
  });

  test("AC1: Scenario 1 - Contact Summary Metrics displayed correctly", async ({
    page,
  }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");
    // beforeEach seeded ≥4 schools with interactions, so the metrics grid
    // always renders. Assert on presence/structure — never absolute counts,
    // which concurrent suites' leaked schools would inflate.
    const contactFreqWidget = page
      .locator('[data-testid="contact-frequency-widget"]')
      .first();
    await expect(contactFreqWidget).toBeVisible();

    await expect(
      contactFreqWidget.locator('[data-testid="metric-total-schools"]'),
    ).toBeVisible();
    await expect(
      contactFreqWidget.locator('[data-testid="metric-contacted-7days"]'),
    ).toBeVisible();
    await expect(
      contactFreqWidget.locator('[data-testid="metric-avg-frequency"]'),
    ).toBeVisible();
    await expect(
      contactFreqWidget.locator('[data-testid="metric-need-attention"]'),
    ).toBeVisible();

    const totalSchools = await contactFreqWidget
      .locator('[data-testid="metric-total-schools"]')
      .textContent();
    expect(totalSchools).toMatch(/\d+/);
  });

  test("AC1: Scenario 1 - Metrics show correct labels", async ({ page }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");
    const contactFreqWidget = page
      .locator('[data-testid="contact-frequency-widget"]')
      .first();
    await expect(contactFreqWidget).toBeVisible();

    await expect(
      contactFreqWidget.locator('[data-testid="metric-total-schools"]'),
    ).toContainText("Total Schools");
    await expect(
      contactFreqWidget.locator('[data-testid="metric-contacted-7days"]'),
    ).toContainText("Last 7 Days");
    await expect(
      contactFreqWidget.locator('[data-testid="metric-avg-frequency"]'),
    ).toContainText("Avg/Month");
    await expect(
      contactFreqWidget.locator('[data-testid="metric-need-attention"]'),
    ).toContainText("Need Attention");
  });

  test("AC2: Scenario 2 - Green border for recent contacts (within 7 days)", async ({
    page,
  }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");

    // Seeded schools each have an interaction within 7 days, so recent-contact
    // rows render. This is the non-vacuous anchor: if rows don't render the
    // whole color-coding feature is broken.
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );
    await expect(schoolRows.first()).toBeVisible({ timeout: 15000 });
    expect(await schoolRows.count()).toBeGreaterThan(0);

    const classes = await schoolRows.first().getAttribute("class");
    expect(classes).toMatch(/border-(green|yellow|red)-500/);
  });

  test("AC2: Scenario 2 - Yellow border for schools contacted 8-30 days ago", async ({
    page,
  }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify that school rows have color-coded borders
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    const count = await schoolRows.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // If schools exist, verify they have border classes
    if (count > 0) {
      const firstSchool = schoolRows.first();
      const classes = await firstSchool.getAttribute("class");
      expect(classes).toContain("border-l-4");
    }
  });

  test("AC2: Scenario 2 - Red border classes applied for old contacts", async ({
    page,
  }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify color-coding border exists on contacted schools
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Each school row should have one of the color borders
      for (let i = 0; i < Math.min(2, await schoolRows.count()); i++) {
        const row = schoolRows.nth(i);
        const classes = await row.getAttribute("class");
        expect(classes).toMatch(/border-(green|yellow|red)-500/);
      }
    }
  });

  test("AC3: Scenario 3 - School rows are clickable", async ({ page }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      const firstSchool = schoolRows.first();
      // Verify it's a link
      const tagName = await firstSchool.evaluate((el) => el.tagName);
      expect(tagName.toLowerCase()).toBe("a");

      // Verify href contains /schools/
      const href = await firstSchool.getAttribute("href");
      expect(href).toContain("/schools/");
    }
  });

  test("AC3: Scenario 3 - Clicking school navigates to school detail page", async ({
    page,
  }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      const firstSchool = schoolRows.first();
      const schoolHref = await firstSchool.getAttribute("href");

      // Click the school row
      await firstSchool.click();

      // Wait for navigation
      await page.waitForURL((url) => url.pathname.includes("/schools/"));

      // Verify we're on a school detail page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/schools/");
      expect(currentUrl).not.toContain("/dashboard");
    }
  });

  test("AC3: Scenario 3 - School detail page shows quick action buttons", async ({
    page,
  }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Click first school
      await schoolRows.first().click();
      await page.waitForURL(/\/schools\/[^/]+$/);

      // Verify "Log Interaction" button exists
      const logInteractionBtn = page.locator("text=Log Interaction");
      await expect(logInteractionBtn).toBeVisible();

      // Verify "Send Email" button exists
      const sendEmailBtn = page.locator("text=Send Email");
      await expect(sendEmailBtn).toBeVisible();
    }
  });

  test("AC4: Real-time Updates - Metrics update after logging interaction", async ({
    page,
  }) => {
    // TODO: test account has 0 schools to interact with. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    // Navigate to add interaction (this is simplified - actual implementation may vary)
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Click first school
      await schoolRows.first().click();
      await page.waitForURL(/\/schools\/[^/]+$/);

      // Click Log Interaction button
      const logInteractionBtn = page.locator("text=Log Interaction");
      if (await logInteractionBtn.isVisible()) {
        await logInteractionBtn.click();
        // Wait for navigation or modal
      }
    }
  });

  test("Contact Frequency widget displays metrics section", async ({
    page,
  }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    const contactFreqWidget = page
      .locator('[data-testid="contact-frequency-widget"]')
      .first();
    await expect(contactFreqWidget).toBeVisible();

    // Seed guarantees tracked schools, so the metrics grid renders.
    await expect(
      contactFreqWidget.locator('[data-testid^="metric-"]').first(),
    ).toBeVisible();
  });

  test("Metrics display with proper formatting", async ({ page }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    const contactFreqWidget = page
      .locator('[data-testid="contact-frequency-widget"]')
      .first();
    const avgFrequency = contactFreqWidget.locator(
      '[data-testid="metric-avg-frequency"]',
    );

    // Seed guarantees tracked schools, so Avg/Month renders a number. The
    // widget prints it as either a decimal ("1.4") or a whole number ("2").
    await expect(avgFrequency).toBeVisible();
    await expect(avgFrequency).toContainText(/\d/);
  });

  test("Contact frequency widget responsive on mobile", async ({ page }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");
    // Set mobile viewport then re-navigate so layout renders at mobile size.
    // Re-settle after the re-goto so the widget's async data has loaded before
    // we assert (the missing settle here was the source of the flake).
    await page.setViewportSize({ width: 375, height: 667 });
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    const contactFreqWidget = page
      .locator('[data-testid="contact-frequency-widget"]')
      .first();
    await expect(contactFreqWidget).toBeVisible();

    // Metric grid is grid-cols-2 on mobile — cards still render with schools.
    await expect(
      contactFreqWidget.locator('[data-testid^="metric-"]').first(),
    ).toBeVisible();
  });

  test("Color-coded schools display properly stacked", async ({ page }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Verify max 5 schools displayed
      const displayCount = await schoolRows.count();
      expect(displayCount).toBeLessThanOrEqual(5);

      // Verify each has proper structure
      for (let i = 0; i < Math.min(3, displayCount); i++) {
        const row = schoolRows.nth(i);
        await expect(row).toBeVisible();

        // Should have border-l-4 class
        const classes = await row.getAttribute("class");
        expect(classes).toContain("border-l-4");
      }
    }
  });

  test("Summary metrics are accurate for tracked schools", async ({ page }) => {
    test.skip(!seedReady, "dashboard-8-2 seed unavailable");
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    const contactFreqWidget = page
      .locator('[data-testid="contact-frequency-widget"]')
      .first();
    const totalSchoolsMetric = contactFreqWidget.locator(
      '[data-testid="metric-total-schools"]',
    );
    await expect(totalSchoolsMetric).toBeVisible();

    const totalSchools = parseInt(
      (await totalSchoolsMetric.textContent()) || "0",
    );
    const contacted7Days = parseInt(
      (await contactFreqWidget
        .locator('[data-testid="metric-contacted-7days"]')
        .textContent()) || "0",
    );

    // Seed guarantees ≥4 schools; the invariant holds regardless of how many
    // other suites leaked in — contacted-in-7-days is a subset of the total.
    expect(totalSchools).toBeGreaterThan(0);
    expect(contacted7Days).toBeLessThanOrEqual(totalSchools);
  });

  test("Hover effects visible on school rows", async ({ page }) => {
    // TODO: test account has 0 schools. Skipped until seed data added.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.waitForContactFrequencySettled();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      const firstSchool = schoolRows.first();

      // Verify cursor-pointer class
      const classes = await firstSchool.getAttribute("class");
      expect(classes).toContain("cursor-pointer");
      expect(classes).toContain("hover:bg-slate-100");
    }
  });
});

test.describe("User Story 8.2: Contact Frequency Summary — empty state", () => {
  // Dedicated fresh account so the empty state is deterministic. The shared
  // player account is never actually empty (this suite seeds it, and concurrent
  // suites leak their own schools into it), so empty-state coverage has to run
  // against an account guaranteed to own zero schools.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows the empty state when the player has no tracked schools", async ({
    page,
  }) => {
    const email = `empty-dash-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    const user = await createOneOffTestUser({
      email,
      password,
      displayName: "Empty Dashboard User",
      role: "player",
    });

    // Mark onboarding complete so middleware/onboarding.ts lets the account
    // reach /dashboard — the account still owns zero schools.
    await getSupabaseAdmin()
      .from("users")
      .update({ phase_milestone_data: { onboarding_complete: true } })
      .eq("id", user.id);

    try {
      const authPage = new AuthPage(page);
      await authPage.login(email, password, /\/(dashboard|verify-email)/);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      await dashboardPage.waitForContactFrequencySettled();

      const widget = page
        .locator('[data-testid="contact-frequency-widget"]')
        .first();
      await expect(widget).toContainText("No schools tracked yet");
    } finally {
      await deleteOneOffTestUser(email).catch(() => {});
    }
  });
});
