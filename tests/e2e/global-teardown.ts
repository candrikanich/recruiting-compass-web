import type { FullConfig } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";
import { getSupabaseAdmin } from "./seed/helpers/supabase-admin";
import { reapDebris } from "./seed/helpers/debris";
import { getRunId } from "./seed/helpers/run-id";
import { TEST_ACCOUNTS } from "./config/test-accounts";

// Load Supabase credentials the same way global-setup does.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Reap E2E debris after the run so the shared prod DB does not accumulate the
 * one-off accounts specs create-without-teardown, plus RUN_ID-tagged
 * schools/coaches/interactions this run created under the shared TEST_ACCOUNTS.
 * Non-fatal by design: a cleanup failure must never fail an otherwise-green
 * E2E run. Set E2E_SKIP_TEARDOWN=1 to disable both steps (e.g. when debugging
 * leaked data).
 *
 * CORRECTED post-Task-1-ruling: the plan's first draft of this file replaced
 * the existing reapDebris(...) step wholesale — a real regression caught by
 * the Task 1 implementer. reapDebris cleans up a DIFFERENT debris category
 * (one-off auth users, hit 768 leaked once) and has its own
 * E2E_SKIP_TEARDOWN=1 kill switch. Both steps now run, gated by the same
 * switch, each independently non-fatal.
 */
async function globalTeardown(_config: FullConfig): Promise<void> {
  if (process.env.E2E_SKIP_TEARDOWN === "1") {
    console.log("🧹 E2E teardown skipped (E2E_SKIP_TEARDOWN=1)");
    return;
  }

  console.log("🧹 E2E Global Teardown — reaping test debris...");
  const supabase = getSupabaseAdmin();

  try {
    const r = await reapDebris(supabase, { execute: true });
    if (r.matched === 0) {
      console.log("  ✅ No debris users to reap");
    } else {
      console.log(
        `  ✅ Reaped ${r.deletedUsers}/${r.matched} debris users ` +
          `(${r.failedUsers} failed) + ${r.deletedUnits} orphan family_units`,
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠️  Debris-user reap failed (non-fatal): ${msg}`);
  }

  try {
    const runId = getRunId();
    const emails = Object.values(TEST_ACCOUNTS).map((a) => a.email);
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .in("email", emails);
    const userIds = (users ?? []).map((u) => (u as { id: string }).id);
    if (userIds.length === 0) return;

    const { data: schools } = await supabase
      .from("schools")
      .select("id")
      .in("user_id", userIds)
      .like("name", `[e2e-${runId}]%`);
    const ids = (schools ?? []).map((s) => (s as { id: string }).id);
    if (ids.length === 0) {
      console.log(`🧹 RUN_ID ${runId}: nothing to tear down`);
      return;
    }

    await supabase.from("interactions").delete().in("school_id", ids);
    await supabase.from("coaches").delete().in("school_id", ids);
    await supabase.from("schools").delete().in("id", ids);
    console.log(`🧹 RUN_ID ${runId}: tore down ${ids.length} school(s)`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠️  RUN_ID school sweep failed (non-fatal): ${msg}`);
  }
}

export default globalTeardown;
