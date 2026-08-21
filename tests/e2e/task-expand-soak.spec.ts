import { test, expect } from "@playwright/test";
import { soak, NODE_ALLOWANCE } from "./helpers/soak";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/**
 * Soak test — task expand/collapse (player session).
 *
 * Expanding a task mounts its detail subtree (DOM nodes + listeners) and
 * collapsing unmounts it. A player leaves the tasks list open and expands
 * rows repeatedly; if teardown leaks, nodes/listeners climb until the tab
 * degrades. This cycles expand→collapse ~60x and asserts counts stay flat.
 *
 * CADENCE / EXECUTION: nightly, and as part of the FULL suite run — not a
 * standalone invocation. Deep pages in this app do not fully hydrate their
 * data layer under an isolated run with only injected storageState (the tasks
 * list comes up empty; see planning/lessons.md "Isolated deep-page hydration").
 * The full nightly suite warms session + stores via earlier specs, at which
 * point the task list renders and this measures cleanly.
 */

const RUN_SOAK = process.env.SOAK === "1";

test.describe("Task expand/collapse — memory soak", () => {
  test.skip(!RUN_SOAK, "soak tests run nightly only (set SOAK=1)");

  // Tasks are grade-derived; without a graduation_year the player has no tasks.
  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const playerId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.player.email,
      );
      if (playerId) {
        await supabase
          .from("users")
          .update({ graduation_year: 2028 })
          .eq("id", playerId);
      }
    } catch (e) {
      console.warn("⚠️  task-expand-soak seed failed:", e);
    }
  });

  test("expanding and collapsing a task does not leak DOM nodes or listeners", async ({
    page,
  }) => {
    await page.goto("/tasks");

    const firstTask = page.locator("[data-testid='task-item']").first();
    await expect(firstTask).toBeVisible({ timeout: 45000 });

    const toggle = firstTask.locator("button").first();
    const detail = firstTask.locator(".border-t");

    // One flow iteration = expand then collapse, waiting for each state so the
    // mount/unmount completes before measuring the next loop.
    const runFlow = async () => {
      await toggle.click();
      await expect(detail).toBeVisible();
      await toggle.click();
      await expect(detail).toBeHidden();
    };

    const { baseline, after } = await soak(page, runFlow, 60, 5);

    // eslint-disable-next-line no-console
    console.log("[soak] task-expand", { baseline, after });

    expect(after.listeners).toBeLessThanOrEqual(baseline.listeners);
    expect(after.nodes).toBeLessThan(baseline.nodes + NODE_ALLOWANCE);
  });
});
