import { createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import { requiresGuardianInvite } from "~/utils/age";

/**
 * Blocks outbound actions for a 13-17 player whose guardian hasn't confirmed their
 * account — including one who never named a guardian at all (skipped the signup
 * wizard's guardian step). The client disables these surfaces too, but a disabled
 * button is a courtesy, not a control — this is the enforcement.
 *
 * Locks by default: any 13-17 player without a stamped `guardian_consent_at` is
 * blocked, regardless of whether a guardian_claims row exists, is pending, was never
 * created, or expired. This replaces the previous claims-keyed check (locked only
 * when a *live* claim happened to exist), which left messaging silently unlocked for
 * a player who skipped naming a guardian entirely — there was no claim row for that
 * check to find. `accept.post.ts` (both the guardian-invite and the player-claim
 * paths) stamps `guardian_consent_at` on confirmation, so this is a safe, direct
 * swap with no backfill needed (this app has no pre-existing user population as of
 * the 2026-09-12 guardian-optional-signup-wizard design).
 *
 * Fails open (does not throw) for adults, parents, and when the user row can't be
 * found — a lookup failure must never lock someone out of their own account. The DB
 * gate and this function together remain authoritative regardless of client state.
 */
export async function assertGuardianConfirmed(
  supabase: SupabaseClient<Database>,
  userId: string,
  action = "do this",
): Promise<void> {
  const { data: user } = await supabase
    .from("users")
    .select("role, date_of_birth, guardian_consent_at")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return;
  if (user.role !== "player") return;
  if (!requiresGuardianInvite(user.date_of_birth)) return;
  if (user.guardian_consent_at) return;

  throw createError({
    statusCode: 403,
    statusMessage: `Your parent or guardian needs to confirm your account before you can ${action}.`,
  });
}
