import { createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

/**
 * Blocks outbound actions for a 13-17 player whose guardian hasn't confirmed their account.
 *
 * The client disables these surfaces too, but a disabled button is a courtesy, not a
 * control — this is the enforcement. Covers the "locked" column of the capability matrix in
 * planning/2026-09-11-guardian-linked-signup-spec.md.
 *
 * Keyed on an outstanding guardian_claims row rather than on guardian_consent_at being
 * null: minors who joined through the older family-invite path predate the consent columns,
 * and keying off consent would retroactively lock accounts this flow never touched.
 */
export async function assertGuardianConfirmed(
  supabase: SupabaseClient<Database>,
  userId: string,
  action = "do this",
): Promise<void> {
  const { data: claim } = await supabase
    .from("guardian_claims")
    .select("status")
    .eq("player_user_id", userId)
    .neq("status", "claimed")
    .neq("status", "revoked")
    .maybeSingle();

  if (claim) {
    throw createError({
      statusCode: 403,
      statusMessage: `Your parent or guardian needs to confirm your account before you can ${action}.`,
    });
  }
}
