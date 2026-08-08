import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import { getUserRole } from "~/server/utils/auth";

/**
 * Resolves the athlete whose suggestions a request acts on.
 *
 * Players act on their own suggestions, so their own id is returned. Parents act on
 * their linked player's suggestions (family-collaboration model), so we resolve the
 * family's `player` member. Falls back to the caller's own id when the parent has no
 * resolvable player (no family membership, or no player in the family).
 *
 * This is the logic that was inlined in `GET /api/suggestions`; the dismiss/complete
 * PATCH endpoints need the same resolution or a parent's action scopes to their own
 * (non-matching) id and updates zero rows.
 */
export async function resolveAthleteId(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const role = await getUserRole(userId, supabase);
  if (role !== "parent") return userId;

  const { data: parentMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", userId)
    .eq("role", "parent")
    .maybeSingle();
  if (!parentMembership) return userId;

  const { data: playerMember } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", parentMembership.family_unit_id)
    .eq("role", "player")
    .maybeSingle();

  return playerMember?.user_id ?? userId;
}
