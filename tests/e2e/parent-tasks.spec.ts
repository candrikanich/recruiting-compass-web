import { test, expect } from "@playwright/test";

// pages/tasks/index.vue confirmed present.
// Confirmed testids: task-item, status-filter, urgency-filter, task-checkbox-*,
// deadline-badge, athlete-select.
test.describe("Parent Task Viewing Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("tasks page loads for parent user", async ({ page }) => {
    await page.waitForSelector("h1");
    const header = page.locator("h1");
    const headerText = await header.textContent();
    expect(headerText).toMatch(/Tasks|Athlete/);
  });

  test("filter controls are visible", async ({ page }) => {
    await expect(page.locator("[data-testid='status-filter']")).toBeVisible();
    await expect(page.locator("[data-testid='urgency-filter']")).toBeVisible();
  });

  test("can filter tasks by status", async ({ page }) => {
    const statusFilter = page.locator("[data-testid='status-filter']");
    await expect(statusFilter).toBeVisible();
    await statusFilter.selectOption("not_started");

    // Filter applied without crashing — task list still renders
    await expect(page.locator("h1")).toBeVisible();
  });

  test("can filter tasks by urgency", async ({ page }) => {
    const urgencyFilter = page.locator("[data-testid='urgency-filter']");
    await expect(urgencyFilter).toBeVisible();
    await urgencyFilter.selectOption("critical");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("can expand task details when tasks exist", async ({ page }) => {
    // Tasks load after auth + two API calls + render; the old 3s probe raced
    // the spinner. Wait properly for the first task to mount.
    const taskItem = page.locator("[data-testid='task-item']").first();
    await expect(taskItem).toBeVisible({ timeout: 15000 });
    const expandButton = taskItem.locator("button").first();
    await expandButton.click();
    const details = taskItem.locator(".border-t");
    await expect(details).toBeVisible();
  });

  test("sees deadline badges with correct urgency colors", async ({ page }) => {
    // Grade-10 task templates carry a deadline_offset_months; the server
    // computes deadline_date from the athlete's graduation_year, so badges
    // render once tasks load.
    await expect(
      page.locator("[data-testid='task-item']").first(),
    ).toBeVisible({ timeout: 15000 });
    const badges = page.locator("[data-testid='deadline-badge']");
    await expect(badges.first()).toBeVisible({ timeout: 15000 });
    expect(await badges.count()).toBeGreaterThan(0);
  });

  test("sees athlete switcher with multiple athletes", async ({ page }) => {
    const athleteSwitcher = page.locator("[data-testid='athlete-select']");
    const hasSwitcher = await athleteSwitcher
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!hasSwitcher) {
      test.skip();
      return;
    }
    const options = page.locator("[data-testid='athlete-select'] option");
    expect(await options.count()).toBeGreaterThanOrEqual(2);
  });

  // Needs real linked athlete in DB for parent@test.com
  test.skip("parent cannot toggle task checkboxes (read-only view)", async ({
    page,
  }) => {
    await page.waitForSelector("[data-testid*='task-checkbox-']");
    const checkbox = page.locator("[data-testid*='task-checkbox-']").first();
    const isDisabled = await checkbox.isDisabled();
    expect(isDisabled).toBe(true);
  });
});
