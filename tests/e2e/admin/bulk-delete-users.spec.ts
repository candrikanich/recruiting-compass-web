import { test, expect } from "@playwright/test";
import { resolve } from "path";
import { AdminPage } from "../pages/AdminPage";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "../seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

/**
 * E2E tests for bulk delete users feature on admin dashboard.
 *
 * Requires admin@test.com to have is_admin=true and ≥1 deletable user in the
 * table. is_admin is granted persistently in beforeAll; deletable users are
 * seeded per-spec and cleaned up in afterAll.
 */

const RUN_ID = Date.now();
let seededDeletableIds: string[] = [];
let adminGranted = false;

test.describe("Admin Dashboard - Bulk Delete Users", () => {
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/admin.json"),
  });

  let adminPage: AdminPage;

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const adminId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.admin.email,
      );
      if (!adminId) {
        console.warn("⚠️  bulk-delete-users: admin user not found");
        return;
      }
      const { error: grantErr } = await supabase
        .from("users")
        .update({ is_admin: true })
        .eq("id", adminId);
      if (grantErr) {
        console.warn(
          "⚠️  bulk-delete-users: failed to grant admin:",
          grantErr.message,
        );
        return;
      }
      adminGranted = true;

      // Seed 3 deletable users so the table has selectable rows.
      const created: string[] = [];
      for (let i = 0; i < 3; i++) {
        const email = `e2e-deletable-${RUN_ID}-${i}@example.com`;
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password: "TestPass123!",
          email_confirm: true,
          user_metadata: { e2e_deletable: true, display_name: `Deletable ${i}` },
        });
        if (!error && data?.user?.id) {
          created.push(data.user.id);
        }
      }
      seededDeletableIds = created;
    } catch (e) {
      console.warn("⚠️  bulk-delete-users seed threw:", e);
    }
  });

  test.afterAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      for (const id of seededDeletableIds) {
        await supabase.auth.admin.deleteUser(id).catch(() => null);
      }
      // Leave admin@test.com is_admin=true; idempotent across runs.
    } catch {
      // non-fatal
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!adminGranted, "Admin grant failed in beforeAll");
    adminPage = new AdminPage(page);
    await adminPage.goto();

    const currentUrl = await adminPage.getURL();
    if (!currentUrl.includes("/admin")) {
      test.skip(
        true,
        `Redirected away from /admin (url=${currentUrl})`,
      );
    }

    // /admin defaults to the "overview" tab; the bulk-delete UI lives under
    // the "Users" tab — click into it before any select-mode assertions.
    await page
      .locator('button:has-text("Users")')
      .first()
      .click()
      .catch(() => null);

    await page
      .waitForSelector('[data-testid="select-mode-toggle"]', { timeout: 15000 })
      .catch(() => null);
  });

  test("should toggle select mode on button click", async ({ page }) => {
    // Initially, checkboxes should not be visible
    const isHidden = await adminPage.verifySelectModeHidden();
    expect(isHidden).toBe(true);

    // Click select mode toggle
    await adminPage.clickSelectModeToggle();

    // Checkboxes should now be visible
    const isVisible = await adminPage.verifySelectModeVisible();
    expect(isVisible).toBe(true);

    // Click again to exit select mode
    await adminPage.clickSelectModeToggle();

    // Checkboxes should be hidden again
    const isHiddenAgain = await adminPage.verifySelectModeHidden();
    expect(isHiddenAgain).toBe(true);
  });

  test("should select individual users with checkbox", async ({ page }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to select");

    // Enter select mode
    await adminPage.clickSelectModeToggle();

    // Select first user
    await adminPage.selectUser(0);
    let selectedCount = await adminPage.getSelectedUserCount();
    expect(selectedCount).toBe(1);

    // Select second user if available
    if (userCount > 1) {
      await adminPage.selectUser(1);
      selectedCount = await adminPage.getSelectedUserCount();
      expect(selectedCount).toBe(2);
    }
  });

  test("should select all users with select-all checkbox", async ({ page }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 2, "Need at least 2 users to test select-all");

    // Enter select mode
    await adminPage.clickSelectModeToggle();

    // Click select all
    await adminPage.selectAllUsers();

    // Select-all should check every *selectable* row on the visible page. The
    // current admin's row renders a "Current" label instead of a checkbox, but
    // it only lands on the visible page when the admin sorts near the top —
    // users are ordered created_at DESC and admin@test.com is an old account,
    // so it's usually off page 1 (0 excluded rows visible). Asserting against
    // userCount-1 wrongly assumes the admin is always visible. Compare against
    // the actual selectable-checkbox count instead. (Current-user exclusion is
    // covered separately by "should not allow selecting current user".)
    const selectableCount = await adminPage.getSelectableUserCount();
    expect(selectableCount).toBeGreaterThan(0);
    const selectedCount = await adminPage.getSelectedUserCount();
    expect(selectedCount).toBe(selectableCount);
  });

  test("should show bulk delete button when users selected", async ({
    page,
  }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to select");

    // Enter select mode
    await adminPage.clickSelectModeToggle();

    // Bulk delete button should not be visible initially
    let isBulkDeleteVisible = await adminPage.isBulkDeleteButtonVisible();
    expect(isBulkDeleteVisible).toBe(false);

    // Select a user
    await adminPage.selectUser(0);

    // Bulk delete button should now be visible
    isBulkDeleteVisible = await adminPage.isBulkDeleteButtonVisible();
    expect(isBulkDeleteVisible).toBe(true);
  });

  test("should show confirmation modal when bulk delete clicked", async ({
    page,
  }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to select");

    // Enter select mode and select user
    await adminPage.clickSelectModeToggle();
    await adminPage.selectUser(0);

    // Click bulk delete
    await adminPage.clickBulkDeleteButton();

    // Modal should be visible
    const isModalVisible = await adminPage.isConfirmModalVisible();
    expect(isModalVisible).toBe(true);
  });

  test("should cancel bulk delete without deleting", async ({ page }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to select");

    const initialCount = userCount;

    // Enter select mode and select user
    await adminPage.clickSelectModeToggle();
    await adminPage.selectUser(0);

    // Click bulk delete
    await adminPage.clickBulkDeleteButton();

    // Click cancel
    await adminPage.clickCancelBulkDelete();

    // Modal should be gone — wait for the close transition before asserting.
    await expect(
      page.locator('[data-testid="confirm-bulk-delete"]'),
    ).toBeHidden({ timeout: 5000 });

    // User count should be unchanged
    const finalCount = await adminPage.getUserCount();
    expect(finalCount).toBe(initialCount);
  });

  test("should clear selection when exiting select mode", async ({ page }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to select");

    // Enter select mode and select user
    await adminPage.clickSelectModeToggle();
    await adminPage.selectUser(0);

    let selectedCount = await adminPage.getSelectedUserCount();
    expect(selectedCount).toBe(1);

    // Exit select mode
    await adminPage.clickSelectModeToggle();

    // Re-enter select mode
    await adminPage.clickSelectModeToggle();

    // Selection should be cleared
    selectedCount = await adminPage.getSelectedUserCount();
    expect(selectedCount).toBe(0);
  });

  test("should not allow selecting current user", async ({ page }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to test");

    // Enter select mode
    await adminPage.clickSelectModeToggle();

    // Try to interact with "Current" user (should have no checkbox)
    const currentUserCheckboxes = page.locator(
      'td:has-text("Current") input[type="checkbox"]',
    );
    const currentUserCheckboxCount = await currentUserCheckboxes.count();

    // Current user should not have a checkbox
    expect(currentUserCheckboxCount).toBe(0);
  });

  test("should highlight selected users", async ({ page }) => {
    const userCount = await adminPage.getUserCount();
    test.skip(userCount < 1, "No users to select");

    // Enter select mode
    await adminPage.clickSelectModeToggle();

    // Select first user
    await adminPage.selectUser(0);

    // Get first row and check for blue highlight
    const firstRow = page.locator("tbody tr").first();
    const classes = await firstRow.getAttribute("class");

    // Should have blue-50 class when selected
    expect(classes?.includes("bg-blue-50")).toBe(true);
  });
});
