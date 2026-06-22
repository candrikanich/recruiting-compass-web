/**
 * Targeted cleanup of E2E test users accumulated in auth.users.
 *
 * Background:
 *   Many E2E specs create one-off auth users (signup tests, password-reset
 *   tests, parent/player provisioning, etc.) but never clean them up. The
 *   local DB now carries 1000+ stale users. supabase.auth.admin.listUsers()
 *   caps perPage at 1000, so our well-known test accounts can fall off the
 *   first page and existing helpers silently return undefined. The admin
 *   page also hangs while paginating through them all.
 *
 * Usage:
 *   npx tsx scripts/e2e-cleanup-users.ts             # default: dry-run
 *   npx tsx scripts/e2e-cleanup-users.ts --execute   # actually delete
 *
 * Required env: NUXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Safety:
 *   - Default mode is dry-run; --execute is required to delete.
 *   - PROTECT_EMAILS is an absolute deny-list and trumps any pattern match.
 *   - Pattern matches are conservative (require an epoch-ish timestamp in
 *     the local-part) to avoid catching real users with similar prefixes.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getSupabaseAdmin } from "../tests/e2e/seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../tests/e2e/config/test-accounts";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const EXECUTE = process.argv.includes("--execute");

// Hard deny-list: these accounts are NEVER deleted even if they match a
// pattern below.
const PROTECT_EMAILS = new Set<string>([
  TEST_ACCOUNTS.player.email,
  TEST_ACCOUNTS.parent.email,
  TEST_ACCOUNTS.admin.email,
  TEST_ACCOUNTS.iosParent.email,
]);

// Match emails created by E2E spec runs. Patterns require a 10+ digit run
// id (epoch ms) in the local-part to avoid catching real users.
const TEST_USER_PATTERNS = [
  // Anything in the @example.com / @test-example.com sandboxes with an epoch
  // timestamp is unambiguously test debris (no real users live there).
  /^[a-z0-9._+-]+\d{10,}[a-z0-9._-]*@(test-)?example\.com$/i,
  // Cross-domain explicit prefixes (in case any leaked to other domains).
  /^test-[a-z-]+-\d{10,}@/i,
  /^e2e-[a-z-]*-?\d{10,}@/i,
  /^parent-e2e-\d{10,}@/i,
  /^player-e2e-\d{10,}@/i,
  /^test\.player\d+@andrikanich\.com$/i,
];

function isDebris(email: string | null | undefined): boolean {
  if (!email) return false;
  if (PROTECT_EMAILS.has(email)) return false;
  return TEST_USER_PATTERNS.some((p) => p.test(email));
}

async function listAllAuthUsers(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const all: { id: string; email: string | null }[] = [];
  let page = 1;
  const MAX_PAGES = 50;
  while (page <= MAX_PAGES) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error(`listUsers page ${page} failed:`, error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      all.push({ id: u.id, email: u.email ?? null });
    }
    if (users.length < 1000) break;
    page++;
  }
  return all;
}

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

  // Sanity check: refuse to proceed if any protected email matched.
  const protectedMatches = debris.filter(
    (u) => u.email && PROTECT_EMAILS.has(u.email),
  );
  if (protectedMatches.length > 0) {
    console.error(
      `❌ ABORT: matched ${protectedMatches.length} protected emails — pattern is too broad. ` +
        `First: ${protectedMatches[0].email}`,
    );
    process.exit(1);
  }

  if (!EXECUTE) {
    console.log("\n🔎 Dry run — pass --execute to actually delete");
    return;
  }

  console.log("\n🧹 Deleting (with retry + pacing)…");
  let deleted = 0;
  let failed = 0;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < debris.length; i++) {
    const u = debris[i];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (!error) {
        deleted++;
        lastErr = null;
        break;
      }
      lastErr = error;
      // Connect-timeout / 5xx: back off and retry.
      await sleep(500 * (attempt + 1));
    }
    if (lastErr) {
      failed++;
      if (failed <= 5) {
        const msg =
          lastErr && typeof lastErr === "object" && "message" in lastErr
            ? (lastErr as { message?: string }).message
            : String(lastErr);
        console.warn(`  ⚠️  ${u.email}: ${msg}`);
      }
    }
    // Pace ~20 req/s to stay under Supabase admin limits.
    await sleep(50);
    if ((i + 1) % 50 === 0 || i === debris.length - 1) {
      process.stdout.write(
        `\r  ${i + 1}/${debris.length} (${deleted} ok, ${failed} fail)`,
      );
    }
  }
  process.stdout.write("\n");
  console.log(`✅ Deleted ${deleted} users (${failed} failures)`);
}

main().catch((err) => {
  console.error("❌ Cleanup crashed:", err);
  process.exit(1);
});
