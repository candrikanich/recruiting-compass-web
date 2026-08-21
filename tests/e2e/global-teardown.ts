import type { FullConfig } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";
import { getSupabaseAdmin } from "./seed/helpers/supabase-admin";
import { reapDebris } from "./seed/helpers/debris";

// Load Supabase credentials the same way global-setup does.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Reap E2E debris after the run so the shared prod DB does not accumulate the
 * one-off accounts specs create-without-teardown. Non-fatal by design: a
 * cleanup failure must never fail an otherwise-green E2E run. Set
 * E2E_SKIP_TEARDOWN=1 to disable (e.g. when debugging leaked data).
 */
async function globalTeardown(_config: FullConfig): Promise<void> {
  if (process.env.E2E_SKIP_TEARDOWN === "1") {
    console.log("🧹 E2E teardown skipped (E2E_SKIP_TEARDOWN=1)");
    return;
  }

  console.log("🧹 E2E Global Teardown — reaping test debris...");
  try {
    const r = await reapDebris(getSupabaseAdmin(), { execute: true });
    if (r.matched === 0) {
      console.log("  ✅ No debris to reap");
      return;
    }
    console.log(
      `  ✅ Reaped ${r.deletedUsers}/${r.matched} debris users ` +
        `(${r.failedUsers} failed) + ${r.deletedUnits} orphan family_units`,
    );
  } catch (error) {
    // Never fail the run on cleanup — surface and move on.
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠️  Teardown reap failed (non-fatal): ${msg}`);
  }
}

export default globalTeardown;
