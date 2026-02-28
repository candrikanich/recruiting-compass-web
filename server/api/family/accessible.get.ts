import { defineEventHandler, createError, setResponseHeader } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";


export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Deprecation', 'true');
  setResponseHeader(event, 'Sunset', '2026-06-01');

  const logger = useLogger(event, "family/accessible");
  const user = await requireAuth(event);
  logger.debug("User authenticated", { userId: user.id });

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
      logger.error("Failed to fetch family members", membersError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch accessible families" });
    }

    logger.debug("Found family members", {
      count: familyMembers?.length ?? 0,
      members: familyMembers,
    });

    if (!familyMembers || familyMembers.length === 0) {
      logger.debug("No family memberships found, returning empty");
      return {
        success: true,
        families: [],
      };
    }

    // Get family unit IDs
    const familyUnitIds = familyMembers.map((fm) => fm.family_unit_id);
    logger.debug("Family unit IDs", { familyUnitIds });

    // Fetch family unit details (deprecated: player_user_id removed, returning minimal data)
    const { data: families, error: familiesError } = await supabase
      .from("family_units")
      .select("id, created_by_user_id, family_name")
      .in("id", familyUnitIds);

    if (familiesError) {
      logger.error("Failed to fetch family units", familiesError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch accessible families" });
    }

    logger.debug("Fetched families", { familyCount: families?.length ?? 0 });

    // Map to response format (deprecated: athleteId now references family creator)
    const accessibleFamilies = (families || []).map((family) => ({
      familyUnitId: family.id,
      athleteId: family.created_by_user_id,
      athleteName: "Unknown Athlete",
      graduationYear: null as number | null,
      familyName: family.family_name || "Family",
    }));

    logger.debug("Returning accessible families", {
      count: accessibleFamilies.length,
      userId: user.id,
      families: accessibleFamilies,
    });
    return {
      success: true,
      families: accessibleFamilies,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to fetch families", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch families",
    });
  }
});
