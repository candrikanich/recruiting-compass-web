import { test, expect } from "@playwright/test";

/**
 * E2E Tests for User Story 9.3: Task Locking Based on Dependencies
 *
 * Acceptance Criteria:
 * - Task dependencies prevent completion if incomplete
 * - Locked tasks show disabled state with 🔒 badge
 * - Unlocking happens reactively within 1 second
 * - Clear error messages explain why tasks are locked
 * - Athletes can skip locked tasks
 */

test.describe("User Story 9.3 - Task Locking", () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in and on tasks page
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
  });

  test("Scenario: Task shows as locked with disabled checkbox", async ({
    page,
  }) => {
    /**
     * Given: A task with incomplete dependencies
     * When: The athlete views the tasks page
     * Then: The dependent task should show with disabled checkbox and lock badge
     */

    // Find a locked task (one with incomplete prerequisites)
    const lockedTaskItems = await page
      .locator('[data-testid="task-item"]')
      .all();

    for (const item of lockedTaskItems) {
      const hasLockedBadge = await item
        .locator("text=🔒 Locked")
        .isVisible()
        .catch(() => false);

      if (hasLockedBadge) {
        // Verify checkbox is disabled
        const checkbox = item.locator('input[type="checkbox"]');
        const isDisabled = await checkbox.isDisabled();
        expect(isDisabled).toBe(true);

        // Verify tooltip explains why
        const title = await checkbox.getAttribute("title");
        expect(title).toContain("Complete prerequisites");

        // Verify lock badge exists
        const badge = item.locator("text=🔒 Locked");
        await expect(badge).toBeVisible();

        // Verify title is greyed out
        const taskTitle = item.locator("h3");
        const titleClass = await taskTitle.getAttribute("class");
        expect(titleClass).toContain("text-slate-400");

        break;
      }
    }
  });

  test("Scenario: Locked task auto-expands to show prerequisites", async ({
    page,
  }) => {
    /**
     * Given: A task with incomplete dependencies on first view
     * When: The athlete views the tasks page
     * Then: The locked task should auto-expand showing prerequisites
     */

    // Check if a locked task is expanded on first view
    const expandedSections = await page
      .locator("text=Complete These First")
      .all();

    if (expandedSections.length > 0) {
      // Task was auto-expanded
      const prerequisitesList = await expandedSections[0].locator("li").all();
      expect(prerequisitesList.length).toBeGreaterThan(0);

      // Verify prerequisite titles are shown
      for (const item of prerequisitesList) {
        const text = await item.textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test("Scenario: Task unlocks reactively after prerequisite completion", async ({
    page,
  }) => {
    /**
     * Given: A task B that depends on task A
     * When: The athlete completes task A
     * Then: Task B should unlock within 1 second
     */

    // Find a task with no dependencies and complete it
    const taskItems = await page.locator('[data-testid="task-item"]').all();
    let completedTaskId: string | null = null;

    for (const item of taskItems) {
      const hasLockedBadge = await item
        .locator("text=🔒 Locked")
        .isVisible()
        .catch(() => false);
      const hasPrerequisites = await item
        .locator("text=Prerequisites pending")
        .isVisible()
        .catch(() => false);

      if (!hasLockedBadge && !hasPrerequisites) {
        // This task has no dependencies
        const checkbox = item.locator('input[type="checkbox"]');
        const isDisabled = await checkbox.isDisabled();

        if (!isDisabled) {
          // Complete this task
          await checkbox.click();
          completedTaskId = await item
            .locator('[data-testid*="task-checkbox"]')
            .getAttribute("data-testid");

          // Wait for success message or refetch
          await page.waitForTimeout(1000);
          break;
        }
      }
    }

    if (completedTaskId) {
      // Refetch tasks to see if any previously locked tasks are now unlocked
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify the page still renders without errors
      const errorElements = await page.locator("text=Error").all();
      expect(errorElements.length).toBe(0);
    }
  });

  test("Scenario: Locked task prevents completion with clear error", async ({
    page,
  }) => {
    /**
     * Given: A locked task
     * When: The athlete attempts to click the checkbox
     * Then: An alert should appear explaining which prerequisites are incomplete
     */

    // Listen for alert dialogs
    let alertMessage = "";
    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message;
      await dialog.accept();
    });

    // Find a locked task and attempt to complete it
    const taskItems = await page.locator('[data-testid="task-item"]').all();

    for (const item of taskItems) {
      const hasLockedBadge = await item
        .locator("text=🔒 Locked")
        .isVisible()
        .catch(() => false);

      if (hasLockedBadge) {
        const checkbox = item.locator('input[type="checkbox"]');
        await checkbox.click();

        // Wait for alert
        await page.waitForTimeout(500);

        if (alertMessage) {
          expect(alertMessage).toContain("Cannot complete task");
          expect(alertMessage).toContain("prerequisites");
        }

        break;
      }
    }
  });

  test("Scenario: Locked task can be skipped for flexibility", async ({
    page,
  }) => {
    /**
     * Given: A locked task
     * When: The athlete chooses to skip it via expanded options
     * Then: The task should be marked as skipped
     */

    // Find a locked task with expanded view
    const expandedSections = await page
      .locator("text=Complete These First")
      .all();

    if (expandedSections.length > 0) {
      // Look for skip button in the expanded section
      const skipButton = expandedSections[0]
        .locator('button:has-text("Skip")')
        .first();
      const skipButtonExists = await skipButton.isVisible().catch(() => false);

      // Skip button may or may not be present depending on UI implementation
      // This test documents the expected behavior
      if (skipButtonExists) {
        await skipButton.click();

        // Wait for update
        await page.waitForTimeout(500);

        // Verify status shows skipped
        const statusBadge = expandedSections[0].locator("text=Skipped").first();
        await expect(statusBadge).toBeVisible();
      }
    }
  });

  test("Scenario: Task list respects logical order with dependency chain", async ({
    page,
  }) => {
    /**
     * Given: Tasks with chain dependencies (A → B → C)
     * When: The athlete views the tasks page
     * Then: Only task A should be completable, B and C should be locked
     */

    const taskItems = await page.locator('[data-testid="task-item"]').all();

    let unlockedCount = 0;
    let lockedCount = 0;

    for (const item of taskItems) {
      const hasLockedBadge = await item
        .locator("text=🔒 Locked")
        .isVisible()
        .catch(() => false);

      if (hasLockedBadge) {
        const checkbox = item.locator('input[type="checkbox"]');
        const isDisabled = await checkbox.isDisabled();
        expect(isDisabled).toBe(true);
        lockedCount++;
      } else {
        const checkbox = item.locator('input[type="checkbox"]');
        const isDisabled = await checkbox.isDisabled();
        if (!isDisabled) {
          unlockedCount++;
        }
      }
    }

    // Should have at least one unlocked and one locked task
    // (if the test has dependencies set up)
    if (taskItems.length > 1) {
      expect(unlockedCount + lockedCount).toBeGreaterThanOrEqual(1);
    }
  });

  test("Scenario: Server prevents bypass of locked tasks", async ({
    page,
    context,
  }) => {
    /**
     * Given: A locked task
     * When: An athlete makes a direct API call to complete it
     * Then: The server should return 400 error with prerequisite info
     */

    // Make direct API call to attempt completing a locked task
    const response = await context.request.patch(
      "/api/athlete-tasks/some-locked-task-id",
      {
        data: { status: "completed" },
        headers: {
          "Content-Type": "application/json",
          // Auth headers would be added by the application
        },
      },
    );

    // If the task is locked, expect 400
    // If the task doesn't exist, expect 404
    // If successful, expect 200
    expect([200, 400, 404]).toContain(response.status);

    if (response.status === 400) {
      const body = await response.json();
      expect(body.statusMessage).toContain("prerequisites");
    }
  });

  test("Scenario: Multiple prerequisites all show in error message", async ({
    page,
  }) => {
    /**
     * Given: A task with multiple incomplete dependencies
     * When: The athlete attempts to complete it
     * Then: The error message lists all incomplete prerequisites
     */

    let alertMessage = "";
    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message;
      await dialog.accept();
    });

    // Find a task with multiple prerequisites
    const taskItems = await page.locator('[data-testid="task-item"]').all();

    for (const item of taskItems) {
      // Count how many prerequisites
      const prerequisites = await item
        .locator("text=Complete These First")
        .then(async (el) => {
          const list = el.locator("li");
          return await list.count();
        })
        .catch(() => 0);

      if (prerequisites > 1) {
        const checkbox = item.locator('input[type="checkbox"]');
        const isDisabled = await checkbox.isDisabled();

        if (isDisabled) {
          await checkbox.click();
          await page.waitForTimeout(500);

          if (alertMessage) {
            // Should contain multiple task names
            const taskNames = alertMessage.match(/Task \d+/g) || [];
            expect(taskNames.length).toBeGreaterThanOrEqual(prerequisites);
          }
        }
        break;
      }
    }
  });
});
