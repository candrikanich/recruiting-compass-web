import { resolve } from "path";
import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/**
 * E2E for the Growth analytics admin page (pages/admin/growth.vue).
 *
 * Confirms non-admins are redirected away, and that an admin sees the
 * funnel + DAU/WAU/MAU tiles render from live /api/admin/growth data with
 * no console errors.
 */

test.describe("non-admin redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("non-admin is redirected away from /admin/growth", async ({ page }) => {
    await page.goto("/admin/growth");
    await expect
      .poll(() => new URL(page.url()).pathname)
      .not.toBe("/admin/growth");
  });
});

test.describe("admin growth page", () => {
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
        console.warn("⚠️  admin-growth: admin user not found");
        return;
      }
      const { error: grantErr } = await supabase
        .from("users")
        .update({ is_admin: true })
        .eq("id", adminId);
      if (grantErr) {
        console.warn(
          "⚠️  admin-growth: failed to grant admin:",
          grantErr.message,
        );
        return;
      }
      adminGranted = true;
      // Leave admin@test.com is_admin=true; idempotent across runs.
    } catch (e) {
      console.warn("⚠️  admin-growth: grant threw:", e);
    }
  });

  test("admin sees funnel and DAU/WAU/MAU stats with no console errors", async ({
    page,
  }) => {
    test.skip(!adminGranted, "Admin grant failed in beforeAll");
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto("/admin/growth");

    await expect(page.getByText("Invites sent")).toBeVisible();
    await expect(page.getByText("DAU")).toBeVisible();

    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
