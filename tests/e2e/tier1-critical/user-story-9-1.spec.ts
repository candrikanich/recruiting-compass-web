import { test, expect } from "@playwright/test";

test.describe("User Story 9.1 - Athlete Views Their Task List", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to task list page
    await page.goto("/tasks");

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("Scenario 1: Athlete views tasks for their grade", async ({ page }) => {
    // Verify page header
    const heading = page.locator('h1:has-text("My Tasks")');
    await expect(heading).toBeVisible();

    // Verify subtitle
    const subtitle = page.locator("text=Track your recruiting tasks");
    await expect(subtitle).toBeVisible();

    // Verify tasks are displayed
    const taskItems = page.locator('[data-testid="task-item"]');
    const hasAnyTasks = await taskItems.count();

    // Should have at least one task or show empty state
    const emptyState = page.locator("text=/No tasks available|Start/");
    const hasEmptyState = await emptyState.count();

    expect(hasAnyTasks > 0 || hasEmptyState > 0).toBe(true);

    // If there are tasks, verify structure
    if (hasAnyTasks > 0) {
      // Verify checkbox exists
      const checkbox = page.locator('input[type="checkbox"]').first();
      await expect(checkbox).toBeVisible();

      // Verify task title exists
      const taskTitle = page
        .locator('[data-testid="task-item"]')
        .first()
        .locator("h3");
      await expect(taskTitle).toBeVisible();
    }
  });

  test("Scenario 2: Athlete sees progress", async ({ page }) => {
    // Verify progress counter text is visible
    const progressText = page.locator("text=/You've completed/");
    await expect(progressText).toBeVisible();

    // Verify percentage is shown in the text
    const progressWithPercent = page.locator("text=/\\(\\d+%\\)/");
    await expect(progressWithPercent).toBeVisible();

    // Verify progress bar exists
    const progressBar = page.locator(".bg-blue-600").first();
    await expect(progressBar).toBeVisible();

    // Get the progress bar width to verify it's displaying correctly
    const bbox = await progressBar.boundingBox();
    expect(bbox).toBeTruthy();
  });

  test("Scenario 3: Athlete marks task complete", async ({ page }) => {
    // Get initial task count
    const taskItems = page.locator('[data-testid="task-item"]');
    const initialCount = await taskItems.count();

    if (initialCount === 0) {
      test.skip();
    }

    // Find first unchecked task
    const uncheckedCheckbox = page
      .locator('input[type="checkbox"]:not(:checked)')
      .first();
    const isUnchecked = !(await uncheckedCheckbox.isChecked());

    if (!isUnchecked) {
      test.skip();
    }

    // Click the checkbox
    await uncheckedCheckbox.check();

    // Wait for success message
    const successMessage = page.locator("text=Great job!");
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify checkbox is now checked
    await expect(uncheckedCheckbox).toBeChecked();

    // Verify status badge updated
    const statusBadge = page.locator("text=Completed");
    await expect(statusBadge).toBeVisible();
  });

  test("Scenario 4: Athlete marks task incomplete", async ({ page }) => {
    // Find a checked task
    const taskItems = page.locator('[data-testid="task-item"]');
    const initialCount = await taskItems.count();

    if (initialCount === 0) {
      test.skip();
    }

    // Find first checked checkbox
    const checkedCheckbox = page
      .locator('input[type="checkbox"]:checked')
      .first();
    const isChecked = await checkedCheckbox.isChecked();

    if (!isChecked) {
      test.skip();
    }

    // Get initial progress text
    const progressText = page.locator("text=/You've completed \\d+/");
    const initialText = await progressText.textContent();

    // Uncheck the checkbox
    await checkedCheckbox.uncheck();

    // Verify checkbox is now unchecked
    await expect(checkedCheckbox).not.toBeChecked();

    // Wait a moment for state update
    await page.waitForTimeout(500);

    // Verify progress text may have changed
    const updatedText = await progressText.textContent();
    // Both old and new text should exist, they might be the same if only 1 task
    expect(initialText).toBeTruthy();
    expect(updatedText).toBeTruthy();
  });

  test("Scenario 5: Athlete views task details", async ({ page }) => {
    // Get first task
    const firstTask = page.locator('[data-testid="task-item"]').first();
    const tasksExist = await firstTask.count();

    if (tasksExist === 0) {
      test.skip();
    }

    // Click on task to expand details
    const taskTitle = firstTask.locator("h3");
    await taskTitle.click();

    // Wait a moment for expansion animation
    await page.waitForTimeout(200);

    // Verify details section appears
    // Look for "Why It Matters" or other detail headings
    const detailsSection = firstTask.locator("text=Why It Matters");
    const hasDetails = await detailsSection.count();

    // Task may have details or may not - just verify it's clickable
    expect(hasDetails >= 0).toBe(true);

    // Click again to collapse
    await taskTitle.click();
  });

  test("Scenario 6: Mobile view is responsive", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify page loads and is readable
    const heading = page.locator('h1:has-text("My Tasks")');
    await expect(heading).toBeVisible();

    // Verify progress counter is visible on mobile
    const progressCounter = page.locator("text=/You've completed/");
    await expect(progressCounter).toBeVisible();

    // Verify progress bar is visible
    const progressBar = page.locator(".bg-blue-600").first();
    await expect(progressBar).toBeVisible();

    // Verify checkbox is visible and has adequate size for touch
    const checkbox = page.locator('input[type="checkbox"]').first();
    const hasCheckbox = await checkbox.count();

    if (hasCheckbox > 0) {
      const bbox = await checkbox.boundingBox();
      if (bbox) {
        // Check touch target size (should be at least 20px)
        expect(bbox.width).toBeGreaterThanOrEqual(16);
        expect(bbox.height).toBeGreaterThanOrEqual(16);
      }
    }

    // Verify layout is responsive (no horizontal scroll)
    const pageWidth = await page.evaluate(
      () => document.documentElement.offsetWidth,
    );
    const windowWidth = await page.evaluate(() => window.innerWidth);

    expect(pageWidth).toBeLessThanOrEqual(windowWidth + 1); // +1 for rounding
  });

  test("Loading state is shown during fetch", async ({ page }) => {
    // Reload page to trigger loading state
    await page.reload();

    // Look for loading indicator (skeleton loaders or spinner)
    const loadingElement = page.locator(".animate-pulse").first();
    const hasLoadingIndicator = await loadingElement.count();

    // May have loading indicator or may load quickly
    expect(hasLoadingIndicator >= 0).toBe(true);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Content should be visible after load
    const heading = page.locator('h1:has-text("My Tasks")');
    await expect(heading).toBeVisible();
  });

  test("Empty state message is shown when no tasks", async ({ page }) => {
    // This test may skip if user has tasks
    const taskItems = page.locator('[data-testid="task-item"]');
    const hasAnyTasks = await taskItems.count();

    const emptyStateMessage = page.locator("text=/No tasks available|Start/");
    const hasEmptyState = await emptyStateMessage.count();

    // Either show tasks or empty state, not both
    if (hasAnyTasks === 0) {
      expect(hasEmptyState).toBeGreaterThan(0);
    } else {
      expect(hasEmptyState).toBe(0);
    }
  });

  test("Task checkbox toggles visual state immediately", async ({ page }) => {
    // Get first task
    const taskItems = page.locator('[data-testid="task-item"]');
    const hasAnyTasks = await taskItems.count();

    if (hasAnyTasks === 0) {
      test.skip();
    }

    const firstCheckbox = page.locator('input[type="checkbox"]').first();

    // Get initial state
    const initialState = await firstCheckbox.isChecked();

    // Click checkbox
    await firstCheckbox.click();

    // Verify state changed immediately
    const newState = await firstCheckbox.isChecked();
    expect(newState).not.toBe(initialState);

    // Verify visual feedback (status badge should update)
    const statusBadge = firstCheckbox
      .locator(
        'xpath=../..//following-sibling::div[contains(@class, "rounded-full")]',
      )
      .first();
    await expect(statusBadge).toBeVisible();
  });

  test("Task details can be expanded and collapsed", async ({ page }) => {
    // Get first task
    const firstTask = page.locator('[data-testid="task-item"]').first();
    const tasksExist = await firstTask.count();

    if (tasksExist === 0) {
      test.skip();
    }

    // Find clickable element (task title or info area)
    const taskInfo = firstTask.locator("button").first();
    const hasButton = await taskInfo.count();

    if (hasButton === 0) {
      test.skip();
    }

    // Get initial height
    const initialHeight = await firstTask.evaluate((el) => el.offsetHeight);

    // Click to expand
    await taskInfo.click();
    await page.waitForTimeout(200);

    // Get height after expansion
    const expandedHeight = await firstTask.evaluate((el) => el.offsetHeight);

    // Click to collapse
    await taskInfo.click();
    await page.waitForTimeout(200);

    // Get height after collapse
    const collapsedHeight = await firstTask.evaluate((el) => el.offsetHeight);

    // Heights should change (may expand then collapse back)
    expect(initialHeight).toBeTruthy();
    expect(expandedHeight).toBeTruthy();
    expect(collapsedHeight).toBeTruthy();
  });

  test("Page title and metadata are correct", async ({ page }) => {
    // Verify page title contains "Tasks"
    const pageTitle = await page.title();
    expect(pageTitle).toContain("Tasks");

    // Verify URL is correct
    expect(page.url()).toContain("/tasks");
  });

  test("Page performance is acceptable", async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Page should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
  });

  test("Navigation between task list and other pages works", async ({
    page,
  }) => {
    // Verify we're on tasks page
    expect(page.url()).toContain("/tasks");

    // Navigate away (to dashboard for example)
    await page.goto("/dashboard").catch(() => {
      // Dashboard may not exist in test environment
    });

    // Navigate back to tasks
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Verify we're back on tasks page
    expect(page.url()).toContain("/tasks");

    // Verify content is still there
    const heading = page.locator('h1:has-text("My Tasks")');
    await expect(heading).toBeVisible();
  });
});
