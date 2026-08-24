import { resolve } from "path";
import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/**
 * Route-regression guard for the Task 9 monolith→route migration.
 *
 * Each former in-page tab of pages/admin/index.vue is now its own route
 * under layouts/admin.vue. Confirms every route renders its heading with no
 * console errors, and that a non-admin is redirected away.
 */

const routes = [
  { path: "/admin", heading: /overview/i },
  { path: "/admin/users", heading: /users/i },
  { path: "/admin/invitations", heading: /invitation/i },
  { path: "/admin/health", heading: /health/i },
  { path: "/admin/jobs", heading: /jobs/i },
  { path: "/admin/tools", heading: /tools/i },
];

test.describe("non-admin redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("non-admin is redirected away from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect.poll(() => new URL(page.url()).pathname).not.toBe("/admin");
  });
});

test.describe("admin routes render post-migration", () => {
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
        console.warn("⚠️  admin-routes: admin user not found");
        return;
      }
      const { error: grantErr } = await supabase
        .from("users")
        .update({ is_admin: true })
        .eq("id", adminId);
      if (grantErr) {
        console.warn(
          "⚠️  admin-routes: failed to grant admin:",
          grantErr.message,
        );
        return;
      }
      adminGranted = true;
      // Leave admin@test.com is_admin=true; idempotent across runs.
    } catch (e) {
      console.warn("⚠️  admin-routes: grant threw:", e);
    }
  });

  for (const r of routes) {
    test(`${r.path} renders without console errors`, async ({ page }) => {
      test.skip(!adminGranted, "Admin grant failed in beforeAll");
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(r.path);
      await expect(
        page.getByRole("heading", { name: r.heading }),
      ).toBeVisible();
      expect(errors, errors.join("\n")).toHaveLength(0);
    });
  }
});
