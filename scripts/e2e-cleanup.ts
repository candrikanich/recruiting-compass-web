/**
 * Targeted cleanup of E2E test data accumulated under player@test.com.
 *
 * Test specs create schools (and child rows) using deterministic name
 * prefixes; many specs never deleted what they created, so the family
 * now carries 1000+ stale schools — past Supabase's default 1000-row
 * limit, which breaks atomic tests that need a freshly-created entity
 * to appear in subsequent queries.
 *
 * Usage:
 *   npx tsx scripts/e2e-cleanup.ts            # delete
 *   npx tsx scripts/e2e-cleanup.ts --dry-run  # preview only
 *
 * Required env: NUXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Safety: only targets schools whose `name` starts with one of the
 * listed test prefixes AND are owned by player@test.com's family unit.
 * Deletion cascades to coaches/interactions/offers/events/etc. via FK
 * constraints; documents.school_id becomes NULL (documents survive).
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getSupabaseAdmin } from "../tests/e2e/seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../tests/e2e/config/test-accounts";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const TEST_SCHOOL_PREFIXES = [
  // Atomic CRUD pilots (this branch)
  "Atomic CRUD",
  "Coaches Atomic School",
  "Coaches Edge-case School",
  "Documents Atomic School",
  "Interactions Atomic School",
  "0 Offers Atomic",
  "Offers Atomic School",
  // Pre-existing E2E specs
  "Sidebar Test",
  "Docs Test",
  "Notes Test",
  "Coaches Test School",
  "Filter Test School",
  "Detail Test School",
  "No History",
  "Timeline Test",
  "Minimal Test School",
  "Complete Test School",
  "Timestamp Test",
  "Initial Test",
  "User Attribution",
  "Badge Colors",
  "Arrow Test",
  "Comm Test School",
  "Multi Coach Test",
  "History Test",
  "Test School",
  // Edge-case fixtures
  "Minimal School",
  "Complete School",
  "Pro/Con School",
  "Delete Me",
  "Keep Me",
  "First School",
  "Second School",
  "D1 School",
  "D2 School",
  "D3 School",
  "JUCO School",
  "researching School",
  "contacted School",
  "interested School",
  "offer_received School",
  "declined School",
  "committed School",
  "Université Test School",
  "School's Name & Co.",
  "The Very Long",
];

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const supabase = getSupabaseAdmin();

  // 1. Resolve player@test.com → family_unit_id
  const { data: listData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const playerUser = (listData?.users ?? []).find(
    (u) => u.email === TEST_ACCOUNTS.player.email,
  );
  if (!playerUser) {
    console.error(`❌ ${TEST_ACCOUNTS.player.email} not found in auth.users`);
    process.exit(1);
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", playerUser.id)
    .maybeSingle();
  if (!membership) {
    console.error(`❌ ${TEST_ACCOUNTS.player.email} has no family unit`);
    process.exit(1);
  }
  const familyUnitId = (membership as { family_unit_id: string })
    .family_unit_id;

  // 2. Find matching schools (paginated — bypass 1000-row default cap)
  const PAGE_SIZE = 1000;
  const orFilter = TEST_SCHOOL_PREFIXES.map(
    // PostgREST `ilike` treats `*` as wildcard
    (p) => `name.ilike.${p}*`,
  ).join(",");

  let allMatches: { id: string; name: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("schools")
      .select("id, name")
      .eq("family_unit_id", familyUnitId)
      .or(orFilter)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("❌ Query failed:", error.message);
      process.exit(1);
    }
    const rows = (data as { id: string; name: string }[] | null) ?? [];
    allMatches = allMatches.concat(rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(
    `📊 Found ${allMatches.length} test schools under ${TEST_ACCOUNTS.player.email}`,
  );

  if (allMatches.length === 0) {
    console.log("✅ Nothing to clean up");
    return;
  }

  // 3. Show a sample of what we're about to nuke
  const sample = allMatches.slice(0, 10);
  console.log("\nSample:");
  for (const s of sample) console.log(`  - ${s.name}`);
  if (allMatches.length > sample.length) {
    console.log(`  …and ${allMatches.length - sample.length} more`);
  }

  if (DRY_RUN) {
    console.log("\n🔎 Dry run — no changes made");
    return;
  }

  // 4. Delete in batches (Supabase has practical limits on .in() list size)
  console.log("\n🧹 Deleting…");
  const ids = allMatches.map((s) => s.id);
  const BATCH = 200;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batchIds = ids.slice(i, i + BATCH);
    const { error } = await supabase.from("schools").delete().in("id", batchIds);
    if (error) {
      console.error(`❌ Batch delete failed at ${i}:`, error.message);
      process.exit(1);
    }
    deleted += batchIds.length;
    process.stdout.write(`\r  ${deleted}/${ids.length}`);
  }
  process.stdout.write("\n");
  console.log(
    `✅ Deleted ${deleted} schools (and cascaded children: coaches, interactions, offers, events, status history)`,
  );
}

main().catch((err) => {
  console.error("❌ Cleanup crashed:", err);
  process.exit(1);
});
