import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

interface FamilyWithUserDetails {
  id: string;
  student_user_id: string;
  family_name: string | null;
  users?: {
    full_name: string | null;
    graduation_year: number | null;
  } | null;
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    console.log("[/api/family/accessible] User authenticated:", user.id);

    const supabase = useSupabaseAdmin();

    // Fetch all family_units where the user is a member
    const { data: familyMembers, error: membersError } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id)
      .eq("role", "parent");

    if (membersError) {
      console.error(
        "[/api/family/accessible] familyMembers error:",
        membersError,
      );
      throw membersError;
    }

    console.log(
      "[/api/family/accessible] Found family members:",
      familyMembers?.length || 0,
    );
    console.log(
      "[/api/family/accessible] Family member details:",
      familyMembers,
    );

    if (!familyMembers || familyMembers.length === 0) {
      console.log(
        "[/api/family/accessible] No family memberships found, returning empty",
      );
      return {
        success: true,
        families: [],
      };
    }

    // Get family unit IDs
    const familyUnitIds = familyMembers.map((fm) => fm.family_unit_id);
    console.log("[/api/family/accessible] Family unit IDs:", familyUnitIds);

    // Fetch family unit details with athlete names and graduation years
    const { data: families, error: familiesError } = await supabase
      .from("family_units")
      .select(
        `
        id,
        student_user_id,
        family_name,
        users!student_user_id (
          full_name,
          graduation_year
        )
      `,
      )
      .in("id", familyUnitIds);

    if (familiesError) {
      console.error("[/api/family/accessible] families error:", familiesError);
      throw familiesError;
    }

    console.log(
      "[/api/family/accessible] Found families:",
      families?.length || 0,
    );

    // Map to response format
    const accessibleFamilies = (
      (families as FamilyWithUserDetails[]) || []
    ).map((family) => ({
      familyUnitId: family.id,
      athleteId: family.student_user_id,
      athleteName: family.users?.full_name || "Unknown Athlete",
      graduationYear: family.users?.graduation_year || null,
      familyName: family.family_name || "Family",
    }));

    console.log(
      `[/api/family/accessible] Returning ${accessibleFamilies.length} families for user ${user.id}:`,
      accessibleFamilies,
    );
    return {
      success: true,
      families: accessibleFamilies,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch families";
    console.error("[/api/family/accessible] ERROR:", message, err);
    throw createError({
      statusCode: 500,
      message: `Failed to fetch families: ${message}`,
    });
  }
});
