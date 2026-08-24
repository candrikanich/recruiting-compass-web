import { resolve } from "path";
import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/**
 * E2E for the route-based admin layout shell (layouts/admin.vue).
 *
 * "admin sees the nav shell with all links" only passes once Task 9 migrates
 * pages/admin/** to opt into `layout: "admin"` and wires the route files —
 * today pages/admin/index.vue still uses `layout: "default"` with an in-page
 * tab bar, so this test is expected to fail until that migration lands.
 */

test.describe("non-admin redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("non-admin is redirected away from /admin", async ({ page }) => {
    await page.goto("/admin");
    // Match on pathname, not the raw URL string — the admin gate redirects
    // unauthenticated visitors to a "/login?redirect=/admin" URL whose full
    // string still ends in "/admin", which a naive /\/admin$/ regex on
    // page.url() would wrongly treat as "still on /admin".
    await expect.poll(() => new URL(page.url()).pathname).not.toBe("/admin");
  });
});

test.describe("admin nav shell", () => {
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
        console.warn("⚠️  admin-shell: admin user not found");
        return;
      }
      const { error: grantErr } = await supabase
        .from("users")
        .update({ is_admin: true })
        .eq("id", adminId);
      if (grantErr) {
        console.warn(
          "⚠️  admin-shell: failed to grant admin:",
          grantErr.message,
        );
        return;
      }
      adminGranted = true;
      // Leave admin@test.com is_admin=true; idempotent across runs.
    } catch (e) {
      console.warn("⚠️  admin-shell: grant threw:", e);
    }
  });

  test("admin sees the nav shell with all links", async ({ page }) => {
    test.skip(!adminGranted, "Admin grant failed in beforeAll");
    await page.goto("/admin");
    for (const label of [
      "Overview",
      "Users",
      "Invitations",
      "Health",
      "Jobs",
      "Audit",
      "Tools",
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });
});
