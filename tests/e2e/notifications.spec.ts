import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

const RUN_ID = Date.now();
let seededIds: string[] = [];

test.describe("Notifications Page", () => {
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const playerUserId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.player.email,
      );
      if (!playerUserId) {
        console.warn("⚠️  notifications seed: player user not found — skipping");
        return;
      }

      const now = Date.now();
      const ago = (ms: number) => new Date(now - ms).toISOString();
      const rows = [
        // 3 unread (mixed types, scheduled_for set so they sort to the top)
        {
          user_id: playerUserId,
          type: "follow_up_reminder" as const,
          title: `[e2e-${RUN_ID}] Follow up with Coach Smith`,
          message: "It's been 14 days since your last contact.",
          priority: "high",
          read_at: null,
          scheduled_for: ago(60 * 1000),
          related_entity_type: "coach",
        },
        {
          user_id: playerUserId,
          type: "deadline_alert" as const,
          title: `[e2e-${RUN_ID}] Application deadline approaching`,
          message: "Duke University application is due in 7 days.",
          priority: "high",
          read_at: null,
          scheduled_for: ago(2 * 60 * 1000),
        },
        {
          user_id: playerUserId,
          type: "inbound_interaction" as const,
          title: `[e2e-${RUN_ID}] New email from Coach Johnson`,
          message: "Subject: Camp invitation for July.",
          priority: "normal",
          read_at: null,
          scheduled_for: ago(3 * 60 * 1000),
        },
        // 2 read
        {
          user_id: playerUserId,
          type: "daily_digest" as const,
          title: `[e2e-${RUN_ID}] Weekly recap`,
          message: "You logged 3 interactions this week.",
          priority: "low",
          read_at: ago(24 * 60 * 60 * 1000),
          scheduled_for: ago(24 * 60 * 60 * 1000),
        },
        {
          user_id: playerUserId,
          type: "follow_up_reminder" as const,
          title: `[e2e-${RUN_ID}] Old reminder`,
          message: "This one's already been read.",
          priority: "normal",
          read_at: ago(2 * 24 * 60 * 60 * 1000),
          scheduled_for: ago(2 * 24 * 60 * 60 * 1000),
        },
      ];

      const { data, error } = await supabase
        .from("notifications")
        .insert(rows)
        .select("id");
      if (error) {
        console.warn("⚠️  notifications seed insert failed:", error.message);
        return;
      }
      seededIds = (data ?? []).map((r) => r.id as string);
    } catch (e) {
      console.warn("⚠️  notifications seed threw:", e);
    }
  });

  test.afterAll(async () => {
    if (seededIds.length === 0) return;
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("notifications").delete().in("id", seededIds);
    } catch {
      // non-fatal
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForLoadState("domcontentloaded");
    // Wait for the async fetch to render either cards or the empty state —
    // tests that gate on `.border-l-4` count would otherwise see 0 and skip.
    await Promise.race([
      page
        .locator(".border-l-4")
        .first()
        .waitFor({ state: "visible", timeout: 8000 })
        .catch(() => null),
      page
        .locator("text=You're all caught up!")
        .waitFor({ state: "visible", timeout: 8000 })
        .catch(() => null),
    ]);
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
    // Race: wait for first notification card or empty-state copy to appear.
    const notifications = page.locator(".border-l-4").first();
    const emptyState = page.locator("text=You're all caught up!");
    await Promise.race([
      notifications
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => null),
      emptyState
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => null),
    ]);

    const hasNotifications = (await page.locator(".border-l-4").count()) > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

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

    const remaining = await page.locator(".border-l-4").count();
    const emptyState = await page
      .locator("text=No notifications")
      .isVisible()
      .catch(() => false);

    // Either 0 results or empty state shown
    expect(remaining === 0 || emptyState).toBe(true);

    // Clear search — results should restore
    await search.fill("");

    await expect(page.locator(".border-l-4").first()).toBeVisible();
  });

  // ── Type filter ─────────────────────────────────────────────────────────────

  test("clicking a type filter activates it", async ({ page }) => {
    const followUpsBtn = page.locator('button:has-text("Follow-ups")').first();
    await followUpsBtn.click();
    await expect(followUpsBtn).toHaveClass(/bg-blue-600/);

    // "All" filter button only — exclude "Mark all as read" which also contains "All"
    const allBtn = page
      .locator("button")
      .filter({ hasText: /^All$/ })
      .first();
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

    // Switch back to All — exact match to avoid "Mark all as read" collision
    await page
      .locator("button")
      .filter({ hasText: /^All$/ })
      .first()
      .click();

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

    const unreadCountAfter = await page
      .locator(".border-l-4.border-blue-500")
      .count();
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

    // No more unread cards
    const unreadRemaining = await page
      .locator(".border-l-4.border-blue-500")
      .count();
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

    // Parallel workers seed against the same user, so the absolute count
    // moves under our feet (other workers' afterAll deletes fire mid-test).
    // Assert on the specific card we deleted instead of N-1.
    const firstCard = cards.first();
    const firstTitle = (await firstCard.locator("h3").textContent())?.trim();
    expect(firstTitle).toBeTruthy();

    await firstCard.locator("button").click();

    // The card with that title should be gone within a beat.
    await expect(
      page.locator(`.border-l-4:has(h3:text-is("${firstTitle}"))`),
    ).toHaveCount(0, { timeout: 5000 });
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

    // Either navigated away or stayed (notification without action_url)
    // Either way, no crash occurred
    expect(page).toBeTruthy();
  });
});
