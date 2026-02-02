import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

interface UserDetails {
  id: string;
  full_name: string | null;
  graduation_year: number | null;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  console.log("[/api/family/accessible] User authenticated:", user.id);

  try {
    const supabase = useSupabaseAdmin();

    // For non-parents, return empty families list
    if (!user.id) {
      return {
        success: true,
        families: [],
      };
    }

    // Fetch all family_units where the user is a member (only parents have family access)
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
      // Log full error details
      console.error("Full error object:", JSON.stringify(membersError));
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

    // Fetch family unit details
    const { data: families, error: familiesError } = await supabase
      .from("family_units")
      .select("id, student_user_id, family_name")
      .in("id", familyUnitIds);

    if (familiesError) {
      console.error("[/api/family/accessible] families error:", familiesError);
      console.error("Full families error:", JSON.stringify(familiesError));
      throw familiesError;
    }

    // Get student user IDs and fetch user details separately
    const studentUserIds = families?.map((f) => f.student_user_id) || [];
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, graduation_year")
      .in("id", studentUserIds);

    if (usersError) {
      console.error("[/api/family/accessible] users error:", usersError);
      console.error("Full users error:", JSON.stringify(usersError));
      throw usersError;
    }

    // Create a map of user details
    const usersMap = (users || []).reduce(
      (map, user) => {
        map[user.id] = user;
        return map;
      },
      {} as Record<string, UserDetails>,
    );

    console.log(
      "[/api/family/accessible] Found families:",
      families?.length || 0,
    );
    console.log("[/api/family/accessible] Found users:", users?.length || 0);

    // Map to response format
    const accessibleFamilies = (families || []).map((family) => {
      const userDetails = usersMap[family.student_user_id];
      return {
        familyUnitId: family.id,
        athleteId: family.student_user_id,
        athleteName: userDetails?.full_name || "Unknown Athlete",
        graduationYear: userDetails?.graduation_year || null,
        familyName: family.family_name || "Family",
      };
    });

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
