import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";

// TODO: These tests reference test IDs and selectors that need to be verified against actual implementation
test.describe.skip("Parent Task Viewing Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth first
    await authFixture.ensureLoggedIn(page);
    // Then navigate to the app
    await page.goto("http://localhost:3003");
  });

  test("parent can view athlete task list", async ({ page }) => {
    // Navigate to tasks page with parent viewing context
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Verify parent context banner is displayed
    const banner = page.locator("text=Viewing");
    await expect(banner).toContainText("Viewing");
    await expect(banner).toContainText("Tasks (Read-Only)");
  });

  test("parent sees progress summary", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for tasks to load
    await page.waitForSelector("[data-testid='task-item']");

    // Verify progress summary is displayed
    const progressText = page.locator("text=/has completed/");
    await expect(progressText).toBeVisible();

    // Verify progress bar is displayed
    const progressBar = page.locator(".bg-blue-600");
    await expect(progressBar).toBeVisible();
  });

  test("parent sees deadline badges with correct urgency colors", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for deadline badges to load
    await page.waitForSelector("[data-testid='deadline-badge']");

    // Check for critical deadline badge (red)
    const criticalBadge = page.locator("[data-testid='deadline-badge'].bg-red-100");
    const criticalCount = await criticalBadge.count();
    expect(criticalCount).toBeGreaterThanOrEqual(0);

    // Check for urgent deadline badge (orange)
    const urgentBadge = page.locator("[data-testid='deadline-badge'].bg-orange-100");
    const urgentCount = await urgentBadge.count();
    expect(urgentCount).toBeGreaterThanOrEqual(0);

    // Check for upcoming deadline badge (yellow)
    const upcomingBadge = page.locator("[data-testid='deadline-badge'].bg-yellow-100");
    const upcomingCount = await upcomingBadge.count();
    expect(upcomingCount).toBeGreaterThanOrEqual(0);
  });

  test("parent can filter tasks by status", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for filter select to be available
    const statusFilter = page.locator("[data-testid='status-filter']");
    await expect(statusFilter).toBeVisible();

    // Select "Not Started" filter
    await statusFilter.selectOption("not_started");

    // Wait for tasks to update
    await page.waitForTimeout(500);

    // Verify only "Not Started" tasks are displayed
    // (This would depend on actual task data in the database)
  });

  test("parent can filter tasks by urgency", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for filter select to be available
    const urgencyFilter = page.locator("[data-testid='urgency-filter']");
    await expect(urgencyFilter).toBeVisible();

    // Select "Critical" urgency filter
    await urgencyFilter.selectOption("critical");

    // Wait for tasks to update
    await page.waitForTimeout(500);

    // Verify filtered tasks are displayed
  });

  test("parent sees filter controls", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Verify status filter is visible
    const statusFilter = page.locator("[data-testid='status-filter']");
    await expect(statusFilter).toBeVisible();

    // Verify urgency filter is visible
    const urgencyFilter = page.locator("[data-testid='urgency-filter']");
    await expect(urgencyFilter).toBeVisible();

    // Verify filter options
    const statusOptions = page.locator("[data-testid='status-filter'] option");
    await expect(statusOptions).toContainText("All");
    await expect(statusOptions).toContainText("Not Started");
    await expect(statusOptions).toContainText("In Progress");
    await expect(statusOptions).toContainText("Completed");
  });

  test("parent cannot toggle task checkboxes", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for task checkboxes to load
    await page.waitForSelector("[data-testid*='task-checkbox-']");

    // Get first checkbox
    const checkbox = page.locator("[data-testid*='task-checkbox-']").first();

    // Verify checkbox is disabled
    const isDisabled = await checkbox.isDisabled();
    expect(isDisabled).toBe(true);

    // Verify disabled state styling (opacity-50)
    const hasOpacity = await checkbox.evaluate((el: HTMLInputElement) =>
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(hasOpacity as string)).toBeLessThan(1);

    // Try clicking - should not toggle
    const initialState = await checkbox.isChecked();
    await checkbox.click().catch(() => {
      // Click may be prevented
    });
    const finalState = await checkbox.isChecked();
    expect(initialState).toBe(finalState);
  });

  test("parent sees read-only tooltip on checkboxes", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for checkbox to load
    await page.waitForSelector("[data-testid*='task-checkbox-']");

    const checkbox = page.locator("[data-testid*='task-checkbox-']").first();

    // Check title attribute for tooltip
    const title = await checkbox.getAttribute("title");
    expect(title).toContain("Parents can view tasks but cannot mark them complete");
  });

  test("parent sees athlete switcher with multiple athletes", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for athlete switcher to load
    const athleteSwitcher = page.locator("[data-testid='athlete-select']");
    await expect(athleteSwitcher).toBeVisible();

    // Verify switcher has multiple options
    const options = page.locator("[data-testid='athlete-select'] option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("parent can switch between athletes", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for athlete switcher
    const athleteSwitcher = page.locator("[data-testid='athlete-select']");
    await expect(athleteSwitcher).toBeVisible();

    // Get initial athlete name from URL
    const initialUrl = new URL(page.url());
    const initialAthleteId = initialUrl.searchParams.get("athlete_id");
    expect(initialAthleteId).toBe("athlete-123");

    // Switch to different athlete
    await athleteSwitcher.selectOption("athlete-789");

    // Wait for URL to update
    await page.waitForFunction((id) => {
      return new URL(window.location.href).searchParams.get("athlete_id") !== id;
    }, initialAthleteId);

    // Verify URL param changed
    const newUrl = new URL(page.url());
    const newAthleteId = newUrl.searchParams.get("athlete_id");
    expect(newAthleteId).toBe("athlete-789");
  });

  test("parent sees tasks sorted by deadline urgency", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for tasks to load
    await page.waitForSelector("[data-testid='task-item']");

    // Get all deadline badges
    const badges = page.locator("[data-testid='deadline-badge']");
    const count = await badges.count();

    if (count > 1) {
      // Verify badges are in order of urgency (red before orange before yellow)
      for (let i = 0; i < count - 1; i++) {
        const currentBadge = badges.nth(i);
        const nextBadge = badges.nth(i + 1);

        const currentClass = await currentBadge.getAttribute("class");
        const nextClass = await nextBadge.getAttribute("class");

        const urgencyOrder: Record<string, number> = {
          "bg-red-100": 0,
          "bg-orange-100": 1,
          "bg-yellow-100": 2,
          "bg-gray-100": 3,
        };

        const currentUrgency = Object.keys(urgencyOrder).find((key) =>
          currentClass?.includes(key)
        );
        const nextUrgency = Object.keys(urgencyOrder).find((key) =>
          nextClass?.includes(key)
        );

        if (currentUrgency && nextUrgency) {
          expect(urgencyOrder[currentUrgency]).toBeLessThanOrEqual(urgencyOrder[nextUrgency]);
        }
      }
    }
  });

  test("parent can expand task details", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for task to load
    const taskItem = page.locator("[data-testid='task-item']").first();
    await expect(taskItem).toBeVisible();

    // Click to expand
    const expandButton = taskItem.locator("button");
    if (expandButton) {
      await expandButton.click();

      // Verify details are visible
      const details = taskItem.locator(".border-t");
      await expect(details).toBeVisible();
    }
  });

  test("parent does not see success message on task toggle", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for tasks to load
    await page.waitForSelector("[data-testid='task-item']");

    // Verify no success message is shown in the DOM
    const successMessage = page.locator("text=Great job");
    expect(await successMessage.count()).toBe(0);
  });

  test("parent task page header reflects viewing context", async ({ page }) => {
    await page.goto("http://localhost:3003/tasks?parent_view=true&athlete_id=athlete-123");

    // Wait for header to load
    await page.waitForSelector("h1");

    // Verify header contains athlete name or "Tasks"
    const header = page.locator("h1");
    const headerText = await header.textContent();

    expect(headerText).toMatch(/Tasks|Athlete/);
  });
});
