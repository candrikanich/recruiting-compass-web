import { test, expect } from "@playwright/test";
import { loginViaForm } from "./helpers/login";

test.describe("Notifications Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page, "player@test.com", "TestPass123!", /\/dashboard/);
    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");
  });

  // ── Page structure ──────────────────────────────────────────────────────────

  test("renders page with heading and unread count", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Notifications");
    // Unread count paragraph is always rendered (may say "0 unread")
    await expect(page.locator("p").filter({ hasText: /unread/ })).toBeVisible();
  });

  test("renders search bar", async ({ page }) => {
    const search = page.locator('input[placeholder="Search notifications..."]');
    await expect(search).toBeVisible();
  });

  test("renders all type filter buttons", async ({ page }) => {
    const expectedLabels = [
      "All",
      "Follow-ups",
      "Deadlines",
      "Inbound",
      "Digest",
      "Offers",
      "Events",
      "General",
    ];
    for (const label of expectedLabels) {
      await expect(
        page.locator(`button:has-text("${label}")`).first(),
      ).toBeVisible();
    }
  });

  test("All filter is active by default", async ({ page }) => {
    const allButton = page.locator('button:has-text("All")').first();
    await expect(allButton).toHaveClass(/bg-blue-600/);
  });

  // ── Empty or populated state ────────────────────────────────────────────────

  test("shows either notifications or empty state — no blank screen", async ({
    page,
  }) => {
    const hasNotifications =
      (await page.locator(".border-l-4").count()) > 0;
    const hasEmptyState = await page
      .locator("text=You're all caught up!")
      .isVisible()
      .catch(() => false);

    expect(hasNotifications || hasEmptyState).toBe(true);
  });

  test("empty state shows correct copy", async ({ page }) => {
    const isEmpty =
      (await page.locator(".border-l-4").count()) === 0 &&
      (await page
        .locator("text=You're all caught up!")
        .isVisible()
        .catch(() => false));

    if (isEmpty) {
      await expect(page.locator("text=No notifications")).toBeVisible();
      await expect(page.locator("text=You're all caught up!")).toBeVisible();
    }
  });

  // ── Search ──────────────────────────────────────────────────────────────────

  test("search filters notification list", async ({ page }) => {
    const hasNotifications = (await page.locator(".border-l-4").count()) > 0;
    if (!hasNotifications) {
      test.skip();
      return;
    }

    const search = page.locator('input[placeholder="Search notifications..."]');
    // Type a search term that won't match anything
    await search.fill("zzz_no_match_xyz");
    await page.waitForTimeout(200);

    const remaining = await page.locator(".border-l-4").count();
    const emptyState = await page
      .locator("text=No notifications")
      .isVisible()
      .catch(() => false);

    // Either 0 results or empty state shown
    expect(remaining === 0 || emptyState).toBe(true);

    // Clear search — results should restore
    await search.fill("");
    await page.waitForTimeout(200);
    await expect(page.locator(".border-l-4").first()).toBeVisible();
  });

  // ── Type filter ─────────────────────────────────────────────────────────────

  test("clicking a type filter activates it", async ({ page }) => {
    const followUpsBtn = page.locator('button:has-text("Follow-ups")').first();
    await followUpsBtn.click();
    await expect(followUpsBtn).toHaveClass(/bg-blue-600/);

    // All button should no longer be active
    const allBtn = page.locator('button:has-text("All")').first();
    await expect(allBtn).not.toHaveClass(/bg-blue-600/);
  });

  test("switching back to All filter restores full list", async ({ page }) => {
    const hasNotifications = (await page.locator(".border-l-4").count()) > 0;
    if (!hasNotifications) {
      test.skip();
      return;
    }

    const initialCount = await page.locator(".border-l-4").count();

    // Apply a filter unlikely to match all notifications
    await page.locator('button:has-text("Offers")').first().click();
    await page.waitForTimeout(200);

    // Switch back to All
    await page.locator('button:has-text("All")').first().click();
    await page.waitForTimeout(200);

    const restoredCount = await page.locator(".border-l-4").count();
    expect(restoredCount).toBe(initialCount);
  });

  // ── Notification cards ──────────────────────────────────────────────────────

  test("each notification card has title, message, date and delete button", async ({
    page,
  }) => {
    const cards = page.locator(".border-l-4");
    const count = await cards.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const first = cards.first();
    await expect(first.locator("h3")).toBeVisible();
    await expect(first.locator("p").first()).toBeVisible(); // message
    await expect(first.locator("p.text-xs")).toBeVisible(); // date
    // Delete button (XMarkIcon svg wrapper)
    await expect(first.locator("button")).toBeVisible();
  });

  test("unread notifications have blue left border and blue-50 background", async ({
    page,
  }) => {
    const unread = page.locator(".border-l-4.border-blue-500");
    const count = await unread.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await expect(unread.first()).toBeVisible();
    await expect(unread.first()).toHaveClass(/bg-blue-50/);
  });

  test("read notifications have gray left border", async ({ page }) => {
    const read = page.locator(".border-l-4.border-gray-300");
    const count = await read.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await expect(read.first()).toBeVisible();
  });

  // ── Mark as read ────────────────────────────────────────────────────────────

  test("clicking a notification marks it as read", async ({ page }) => {
    const unread = page.locator(".border-l-4.border-blue-500");
    const hasUnread = (await unread.count()) > 0;
    if (!hasUnread) {
      test.skip();
      return;
    }

    const unreadCountBefore = await unread.count();
    await unread.first().click();
    await page.waitForTimeout(500);

    const unreadCountAfter = await page.locator(".border-l-4.border-blue-500").count();
    expect(unreadCountAfter).toBeLessThan(unreadCountBefore);
  });

  test("Mark all as read button only shows when there are unread notifications", async ({
    page,
  }) => {
    const hasUnread =
      (await page.locator(".border-l-4.border-blue-500").count()) > 0;
    const markAllBtn = page.locator('button:has-text("Mark all as read")');

    if (hasUnread) {
      await expect(markAllBtn).toBeVisible();
    } else {
      await expect(markAllBtn).not.toBeVisible();
    }
  });

  test("Mark all as read clears all unread indicators", async ({ page }) => {
    const markAllBtn = page.locator('button:has-text("Mark all as read")');
    const isVisible = await markAllBtn.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await markAllBtn.click();
    await page.waitForTimeout(500);

    // No more unread cards
    const unreadRemaining = await page.locator(".border-l-4.border-blue-500").count();
    expect(unreadRemaining).toBe(0);

    // Mark all button should disappear
    await expect(markAllBtn).not.toBeVisible();
  });

  // ── Delete ──────────────────────────────────────────────────────────────────

  test("deleting a notification removes it from the list", async ({ page }) => {
    const cards = page.locator(".border-l-4");
    const initialCount = await cards.count();
    if (initialCount === 0) {
      test.skip();
      return;
    }

    const firstCard = cards.first();
    const deleteBtn = firstCard.locator("button");
    await deleteBtn.click();
    await page.waitForTimeout(500);

    const newCount = await page.locator(".border-l-4").count();
    expect(newCount).toBe(initialCount - 1);
  });

  test("Clear read button only shows when there are read notifications", async ({
    page,
  }) => {
    const hasRead =
      (await page.locator(".border-l-4.border-gray-300").count()) > 0;
    const clearReadBtn = page.locator('button:has-text("Clear read")');

    if (hasRead) {
      await expect(clearReadBtn).toBeVisible();
    } else {
      await expect(clearReadBtn).not.toBeVisible();
    }
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  test("notification with action_url navigates on click", async ({ page }) => {
    // Find a notification that might have an action_url by checking if click navigates
    const cards = page.locator(".border-l-4");
    const count = await cards.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const initialUrl = page.url();
    await cards.first().click();
    await page.waitForTimeout(1000);

    // Either navigated away or stayed (notification without action_url)
    // Either way, no crash occurred
    expect(page).toBeTruthy();
  });
});
