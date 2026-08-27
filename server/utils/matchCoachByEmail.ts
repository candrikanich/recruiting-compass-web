import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

export interface MatchCoachByEmailParams {
  familyUnitId: string;
  email?: string | null;
}

export interface MatchCoachByEmailResult {
  coachId: string | null;
  schoolId: string | null;
}

// ILIKE treats % and _ as wildcards; escape them so a case-insensitive exact
// match never behaves as a pattern match against an attacker-controlled email.
function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Family-scoped, email-only coach lookup for the unauthenticated public
 * Contact-Player flow. Never creates a coach — an unmatched email logs the
 * interaction with coach_id=NULL, and the player links/creates the coach later.
 */
export async function matchCoachByEmail(
  admin: SupabaseClient<Database>,
  params: MatchCoachByEmailParams,
): Promise<MatchCoachByEmailResult> {
  const email = params.email?.trim();
  if (!email) return { coachId: null, schoolId: null };

  const { data } = await admin
    .from("coaches")
    .select("id, school_id")
    .eq("family_unit_id", params.familyUnitId)
    .ilike("email", escapeIlike(email))
    .maybeSingle();

  return { coachId: data?.id ?? null, schoolId: data?.school_id ?? null };
}
