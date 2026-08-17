import { resolve } from "path";
import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/**
 * E2E for the Ops surfaces: cron dashboard (/admin/jobs) with guarded
 * "Run now" trigger, and the DB health panel (/admin/health).
 *
 * Auth pattern mirrors tests/e2e/admin-shell.spec.ts verbatim: empty
 * storageState for the non-admin redirect, and the shared admin.json
 * storageState + idempotent is_admin grant for the admin-only checks.
 */

test.describe("non-admin redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("non-admin is redirected away from /admin/jobs", async ({ page }) => {
    await page.goto("/admin/jobs");
    await expect
      .poll(() => new URL(page.url()).pathname)
      .not.toBe("/admin/jobs");
  });
});

test.describe("admin ops dashboard", () => {
  test.describe.configure({ mode: "serial" });
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/admin.json"),
  });

  let adminGranted = false;

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const adminId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.admin.email,
      );
      if (!adminId) {
        console.warn("⚠️  admin-ops: admin user not found");
        return;
      }
      const { error: grantErr } = await supabase
        .from("users")
        .update({ is_admin: true })
        .eq("id", adminId);
      if (grantErr) {
        console.warn(
          "⚠️  admin-ops: failed to grant admin:",
          grantErr.message,
        );
        return;
      }
      adminGranted = true;
      // Leave admin@test.com is_admin=true; idempotent across runs.
    } catch (e) {
      console.warn("⚠️  admin-ops: grant threw:", e);
    }
  });

  test("admin can trigger the health-ping job from /admin/jobs", async ({
    page,
  }) => {
    test.skip(!adminGranted, "Admin grant failed in beforeAll");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/admin/jobs");

    // The health-ping job card exposes a "Run now" control (it's in
    // TRIGGERABLE_JOBS, not DRYRUN_ONLY_JOBS/BLOCKED_JOBS). Scope to the
    // card's own class combo (not a generic ancestor "div" filter) so the
    // locator resolves to exactly one element instead of every nested div
    // that happens to contain both the job name and a "Run now" button.
    const jobCard = page
      .locator("div.rounded-lg.border.p-4")
      .filter({ hasText: "health-ping" });
    await expect(jobCard).toBeVisible();

    const runButton = jobCard.getByRole("button", { name: /run now/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();

    // Race the click against the trigger response rather than polling for
    // the transient "Running..." state — a fast local roundtrip can settle
    // before Playwright's next poll observes the disabled state.
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/cron/trigger") &&
        res.request().method() === "POST",
    );
    await runButton.click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    // Button settles back to its idle "Run now" / enabled state once the
    // trigger resolves and the job history refreshes.
    await expect(runButton).toHaveText(/run now/i, { timeout: 15000 });
    await expect(runButton).toBeEnabled();

    expect(consoleErrors).toEqual([]);
  });

  test("Database panel on /admin/health renders row counts", async ({
    page,
  }) => {
    test.skip(!adminGranted, "Admin grant failed in beforeAll");

    await page.goto("/admin/health");

    await expect(
      page.getByRole("heading", { name: "Database" }),
    ).toBeVisible();
    await expect(page.getByText("Row counts")).toBeVisible();

    // At least one row-count stat tile (e.g. "users") should render with a
    // numeric-looking value once the fetch resolves.
    await expect(page.getByText("users", { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });
});
