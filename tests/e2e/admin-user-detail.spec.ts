import { resolve } from "path";
import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/**
 * E2E for the read-only admin user-detail page (pages/admin/users/[id].vue).
 *
 * Mirrors the real admin-auth pattern used by admin-shell.spec.ts and
 * admin/bulk-delete-users.spec.ts: storageState tests/e2e/.auth/admin.json +
 * idempotent is_admin grant via getSupabaseAdmin/findUserIdByEmail.
 */

test.describe("non-admin redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("non-admin is redirected away from /admin/users/:id", async ({
    page,
  }) => {
    await page.goto("/admin/users/00000000-0000-0000-0000-000000000000");
    // Match on pathname, not the raw URL string — the admin gate redirects
    // unauthenticated visitors to a "/login?redirect=/admin/users/..." URL
    // whose full string still contains "/admin/users/", which a naive
    // toHaveURL(/\/admin\/users\//) assertion on page.url() would wrongly
    // treat as "still on the detail route" (same pitfall documented in
    // admin-shell.spec.ts for the /admin redirect).
    await expect
      .poll(() => new URL(page.url()).pathname)
      .not.toMatch(/^\/admin\/users\//);
  });
});

test.describe("admin user detail (read-only view-as)", () => {
  test.describe.configure({ mode: "serial" });
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/admin.json"),
  });

  let adminGranted = false;
  let adminUserId: string | null = null;

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const adminId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.admin.email,
      );
      if (!adminId) {
        console.warn("⚠️  admin-user-detail: admin user not found");
        return;
      }
      const { error: grantErr } = await supabase
        .from("users")
        .update({ is_admin: true })
        .eq("id", adminId);
      if (grantErr) {
        console.warn(
          "⚠️  admin-user-detail: failed to grant admin:",
          grantErr.message,
        );
        return;
      }
      adminGranted = true;
      adminUserId = adminId;
      // Leave admin@test.com is_admin=true; idempotent across runs.
    } catch (e) {
      console.warn("⚠️  admin-user-detail: grant threw:", e);
    }
  });

  test("admin opens a real user's detail and sees the read-only banner", async ({
    page,
  }) => {
    test.skip(!adminGranted || !adminUserId, "Admin grant failed in beforeAll");
    test.skip(
      !process.env.NUXT_PUBLIC_ADMIN_HOST,
      "NUXT_PUBLIC_ADMIN_HOST not set — admin pages redirect to prod login",
    );

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`/admin/users/${adminUserId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Read-only admin view")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Schools").first()).toBeVisible({
      timeout: 15000,
    });

    expect(consoleErrors).toEqual([]);
  });
});
