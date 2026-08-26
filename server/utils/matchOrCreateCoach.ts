import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

type CoachRole = Database["public"]["Enums"]["coach_role"];
type CoachInsert = Database["public"]["Tables"]["coaches"]["Insert"];

export interface MatchOrCreateCoachParams {
  familyUnitId: string;
  name: string;
  email?: string | null;
  title?: string | null;
  schoolId?: string | null;
}

export interface MatchOrCreateCoachResult {
  coachId: string;
  created: boolean;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function mapTitleToRole(title?: string | null): CoachRole {
  const normalized = title?.trim().toLowerCase() ?? "";
  if (normalized.includes("head")) return "head";
  if (normalized.includes("assistant")) return "assistant";
  return "recruiting";
}

// ILIKE treats % and _ as wildcards; escape them so a case-insensitive exact
// match never behaves as a pattern match against an attacker-controlled email.
function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * coaches.user_id is legacy NOT NULL (predates family-scoped ownership) with no
 * owning user in the inbound lead-capture flow. Resolve the family's creating
 * user as a stand-in owner, falling back to any family member.
 */
async function resolveOwnerUserId(
  admin: SupabaseClient<Database>,
  familyUnitId: string,
): Promise<string> {
  const { data: family } = await admin
    .from("family_units")
    .select("created_by_user_id")
    .eq("id", familyUnitId)
    .maybeSingle();

  if (family?.created_by_user_id) return family.created_by_user_id;

  const { data: member } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", familyUnitId)
    .order("added_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (member?.user_id) return member.user_id;

  throw new Error(`No owning user found for family ${familyUnitId}; cannot create coach`);
}

export async function matchOrCreateCoach(
  admin: SupabaseClient<Database>,
  params: MatchOrCreateCoachParams,
): Promise<MatchOrCreateCoachResult> {
  const { familyUnitId, name, email, title, schoolId } = params;
  const normalizedEmail = email?.trim() || null;

  if (normalizedEmail) {
    const { data: existing } = await admin
      .from("coaches")
      .select("id")
      .eq("family_unit_id", familyUnitId)
      .ilike("email", escapeIlike(normalizedEmail))
      .maybeSingle();

    if (existing?.id) {
      return { coachId: existing.id, created: false };
    }
  }

  if (!schoolId) {
    throw new Error(
      "matchOrCreateCoach: schoolId is required to create a coach (coaches.school_id is NOT NULL)",
    );
  }

  const { firstName, lastName } = splitName(name);
  const ownerUserId = await resolveOwnerUserId(admin, familyUnitId);

  const insertData: CoachInsert = {
    family_unit_id: familyUnitId,
    first_name: firstName,
    last_name: lastName,
    email: normalizedEmail,
    role: mapTitleToRole(title),
    school_id: schoolId,
    user_id: ownerUserId,
  };

  const { data: created, error } = await admin
    .from("coaches")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create coach");
  }

  return { coachId: created.id, created: true };
}
