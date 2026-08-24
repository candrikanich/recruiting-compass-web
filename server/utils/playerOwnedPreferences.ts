/**
 * Player-owned preferences: the categories whose canonical row belongs to the
 * player-role member of a family. Parents read AND write the athlete's row so the
 * whole family collaborates on one profile.
 */
import { getUserRole } from "~/server/utils/auth";
import type { useSupabaseAdmin } from "~/server/utils/supabase";

// Categories stored against the athlete's user_id; a parent is redirected to the athlete's row.
export const PLAYER_OWNED_CATEGORIES = new Set([
  "location",
  "player",
  "school",
]);

/**
 * Finds the linked athlete's user_id for a parent via family_members.
 * Returns null if no linked athlete is found.
 */
export async function getLinkedAthleteId(
  parentUserId: string,
  supabase: ReturnType<typeof useSupabaseAdmin>,
): Promise<string | null> {
  const { data: parentMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", parentUserId)
    .eq("role", "parent")
    .maybeSingle();

  if (!parentMembership?.family_unit_id) return null;

  const { data: playerMembers } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", parentMembership.family_unit_id)
    .eq("role", "player");

  const members = (playerMembers ?? []) as Array<{ user_id: string }>;
  if (members.length === 0) return null;
  if (members.length === 1) return members[0].user_id;

  // A parent can have several athletes (multi-athlete families). The previous
  // `.maybeSingle()` errored on >1 row and silently returned null, dropping the
  // parent to their own (empty) preference row. Resolve deterministically to the
  // athlete closest to graduation — lowest graduation_year, nulls last, oldest
  // account as a tiebreak — mirroring the app's default parent athlete pick.
  const ids = members.map((m) => m.user_id);
  const { data: athletes } = await supabase
    .from("users")
    .select("id, graduation_year, created_at")
    .in("id", ids);

  const rows = (athletes ?? []) as Array<{
    id: string;
    graduation_year: number | null;
    created_at: string | null;
  }>;
  if (rows.length === 0) return ids[0];

  const sorted = [...rows].sort((a, b) => {
    const ay = a.graduation_year ?? Number.POSITIVE_INFINITY;
    const by = b.graduation_year ?? Number.POSITIVE_INFINITY;
    if (ay !== by) return ay - by;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
  return sorted[0].id;
}

/**
 * Resolves whose preference row to read/write for a category. For player-owned
 * categories, a parent is redirected to the linked athlete's row; everyone else
 * (and all other categories) uses their own id.
 */
export async function resolvePreferenceTargetUserId(
  userId: string,
  category: string,
  supabase: ReturnType<typeof useSupabaseAdmin>,
): Promise<string> {
  if (!PLAYER_OWNED_CATEGORIES.has(category)) return userId;

  const role = await getUserRole(userId, supabase);
  if (role !== "parent") return userId;

  const athleteId = await getLinkedAthleteId(userId, supabase);
  return athleteId ?? userId;
}
