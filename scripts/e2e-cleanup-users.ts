/**
 * Manual backlog purge of E2E test users accumulated in auth.users.
 *
 * Debris identification + deletion logic lives in the shared helper
 * `tests/e2e/seed/helpers/debris.ts` (also used by the automatic
 * global-teardown). This script is the manual, dry-run-by-default entry point
 * for clearing an existing backlog.
 *
 * Usage:
 *   npx tsx scripts/e2e-cleanup-users.ts             # default: dry-run
 *   npx tsx scripts/e2e-cleanup-users.ts --execute   # actually delete
 *
 * Required env: NUXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Safety:
 *   - Default mode is dry-run; --execute is required to delete.
 *   - reapDebris aborts if any protected (fixed TEST_ACCOUNTS) email matched.
 *   - Also sweeps orphan family_units left behind by deleteUser.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getSupabaseAdmin } from "../tests/e2e/seed/helpers/supabase-admin";
import {
  isDebris,
  listAllAuthUsers,
  reapDebris,
} from "../tests/e2e/seed/helpers/debris";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const EXECUTE = process.argv.includes("--execute");

async function main() {
  const supabase = getSupabaseAdmin();

  console.log("📋 Listing all auth.users (paginated)…");
  const allUsers = await listAllAuthUsers(supabase);
  console.log(`   Total: ${allUsers.length}`);

  const debris = allUsers.filter((u) => isDebris(u.email));
  console.log(`📊 Matched ${debris.length} debris users`);

  if (debris.length === 0) {
    console.log("✅ Nothing to clean up");
    return;
  }

  const sample = debris.slice(0, 10);
  console.log("\nSample:");
  for (const u of sample) console.log(`  - ${u.email}`);
  if (debris.length > sample.length) {
    console.log(`  …and ${debris.length - sample.length} more`);
  }

  if (!EXECUTE) {
    console.log("\n🔎 Dry run — pass --execute to actually delete");
    return;
  }

  console.log("\n🧹 Deleting debris users + orphan family_units…");
  const r = await reapDebris(supabase, { execute: true });
  console.log(
    `✅ Deleted ${r.deletedUsers} users (${r.failedUsers} failures) ` +
      `+ ${r.deletedUnits} orphan family_units`,
  );
}

main().catch((err) => {
  console.error("❌ Cleanup crashed:", err);
  process.exit(1);
});
