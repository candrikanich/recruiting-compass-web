/**
 * Shared identification + reaping of E2E test debris.
 *
 * E2E runs against the live Supabase project (TEST_SUPABASE_URL is optional and
 * falls back to the prod URL). Many specs mint one-off auth users with an epoch
 * timestamp in the local-part and never delete them. Left unchecked they
 * accumulate unbounded (hit 768 users / 744 family_units once), pollute the
 * admin dashboard + growth analytics, and eventually push the well-known test
 * accounts off listUsers()'s first 1000-row page.
 *
 * This module is the single source of truth for "what is debris" and "how to
 * reap it", shared by:
 *   - tests/e2e/global-teardown.ts  (runs automatically after every E2E run)
 *   - scripts/e2e-cleanup-users.ts  (manual backlog purge, dry-run by default)
 *
 * Safety model:
 *   - PROTECT_EMAILS is an absolute deny-list (the fixed TEST_ACCOUNTS).
 *   - Patterns require a 10+ digit epoch in the local-part, so they cannot
 *     match a real user who merely shares a prefix.
 *   - reapDebris aborts before deleting if any protected email matched (proof
 *     the pattern set has become too broad).
 *   - deleteUser cascades public.users + family_members + child rows, but NOT
 *     family_units — so we sweep member-less family_units as a second pass.
 */
import { TEST_ACCOUNTS } from "../../config/test-accounts";
import type { getSupabaseAdmin } from "./supabase-admin";

type Admin = ReturnType<typeof getSupabaseAdmin>;

/** Fixed accounts that must NEVER be deleted, even if a pattern matches. */
export const PROTECT_EMAILS = new Set<string>(
  Object.values(TEST_ACCOUNTS).map((a) => a.email),
);

/**
 * Emails created by E2E spec runs. Every pattern requires a 10+ digit run id
 * (epoch ms) in the local-part to avoid catching real users.
 */
export const TEST_USER_PATTERNS: RegExp[] = [
  // @example.com / @test-example.com sandboxes with an epoch timestamp — no
  // real users live there, so this is unambiguously test debris.
  /^[a-z0-9._+-]+\d{10,}[a-z0-9._-]*@(test-)?example\.com$/i,
  // Cross-domain explicit prefixes (in case any leaked to other domains).
  /^test-[a-z-]+-\d{10,}@/i,
  /^e2e-[a-z-]*-?\d{10,}@/i,
  /^parent-e2e-\d{10,}@/i,
  /^player-e2e-\d{10,}@/i,
  /^test\.player\d+@andrikanich\.com$/i,
];

export function isDebris(email: string | null | undefined): boolean {
  if (!email) return false;
  if (PROTECT_EMAILS.has(email)) return false;
  return TEST_USER_PATTERNS.some((p) => p.test(email));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Page through auth.users (listUsers caps perPage at 1000). */
export async function listAllAuthUsers(
  supabase: Admin,
): Promise<{ id: string; email: string | null }[]> {
  const all: { id: string; email: string | null }[] = [];
  const MAX_PAGES = 50;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error(`listUsers page ${page} failed:`, error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) all.push({ id: u.id, email: u.email ?? null });
    if (users.length < 1000) break;
  }
  return all;
}

/** Delete family_invitations sent by any of the given user ids (chunked). */
async function deleteInvitationsBy(
  supabase: Admin,
  userIds: string[],
): Promise<void> {
  const CHUNK = 100;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("family_invitations")
      .delete()
      .in("invited_by", chunk);
    if (error) {
      console.warn(`  ⚠️  delete family_invitations chunk: ${error.message}`);
    }
  }
}

/**
 * Delete family_units that have no remaining members. deleteUser cascades
 * family_members but leaves the parent family_unit as an orphan shell; this
 * reaps those. A unit still holding child rows (schools/interactions/etc) will
 * FK-block its own delete — that is logged and skipped, never fatal.
 */
async function deleteEmptyFamilyUnits(supabase: Admin): Promise<number> {
  const { data: units, error: unitsErr } = await supabase
    .from("family_units")
    .select("id");
  if (unitsErr || !units) {
    if (unitsErr) console.warn(`  ⚠️  list family_units: ${unitsErr.message}`);
    return 0;
  }

  const { data: members, error: membersErr } = await supabase
    .from("family_members")
    .select("family_unit_id");
  if (membersErr) {
    console.warn(`  ⚠️  list family_members: ${membersErr.message}`);
    return 0;
  }
  const occupied = new Set(
    (members ?? []).map((m: { family_unit_id: string }) => m.family_unit_id),
  );
  const emptyIds = units
    .map((u: { id: string }) => u.id)
    .filter((id: string) => !occupied.has(id));
  if (emptyIds.length === 0) return 0;

  let deleted = 0;
  const CHUNK = 100;
  for (let i = 0; i < emptyIds.length; i += CHUNK) {
    const chunk = emptyIds.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("family_units")
      .delete()
      .in("id", chunk);
    if (error) {
      console.warn(`  ⚠️  delete family_units chunk: ${error.message}`);
      continue;
    }
    deleted += chunk.length;
  }
  return deleted;
}

export interface ReapResult {
  totalUsers: number;
  matched: number;
  deletedUsers: number;
  failedUsers: number;
  deletedUnits: number;
  dryRun: boolean;
}

/**
 * Identify and (when execute=true) delete debris users + orphan family_units.
 * Returns counts. Aborts by throwing if a protected email matched a pattern.
 */
export async function reapDebris(
  supabase: Admin,
  opts: { execute: boolean } = { execute: true },
): Promise<ReapResult> {
  const allUsers = await listAllAuthUsers(supabase);
  const debris = allUsers.filter((u) => isDebris(u.email));

  // Guardrail: a protected email should be impossible here (isDebris excludes
  // them), so if one slipped through the pattern set is too broad — abort.
  const protectedMatch = debris.find(
    (u) => u.email && PROTECT_EMAILS.has(u.email),
  );
  if (protectedMatch) {
    throw new Error(
      `reapDebris ABORT: matched protected email ${protectedMatch.email} — ` +
        `pattern set is too broad, refusing to delete`,
    );
  }

  const base: ReapResult = {
    totalUsers: allUsers.length,
    matched: debris.length,
    deletedUsers: 0,
    failedUsers: 0,
    deletedUnits: 0,
    dryRun: !opts.execute,
  };

  if (!opts.execute || debris.length === 0) return base;

  // family_invitations.invited_by references public.users with no ON DELETE
  // cascade, so auth.admin.deleteUser() FK-fails for any user who sent an
  // invite. Clear debris users' invitations first so their delete can proceed.
  await deleteInvitationsBy(
    supabase,
    debris.map((u) => u.id),
  );

  let deletedUsers = 0;
  let failedUsers = 0;
  for (const u of debris) {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (!error) {
        deletedUsers++;
        lastErr = null;
        break;
      }
      lastErr = error;
      await sleep(500 * (attempt + 1)); // back off on 5xx / connect-timeout
    }
    if (lastErr) {
      failedUsers++;
      if (failedUsers <= 5) {
        const msg =
          lastErr && typeof lastErr === "object" && "message" in lastErr
            ? (lastErr as { message?: string }).message
            : String(lastErr);
        console.warn(`  ⚠️  ${u.email}: ${msg}`);
      }
    }
    await sleep(50); // pace ~20 req/s under Supabase admin limits
  }

  const deletedUnits = await deleteEmptyFamilyUnits(supabase);

  return {
    ...base,
    deletedUsers,
    failedUsers,
    deletedUnits,
  };
}
