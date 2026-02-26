import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

interface UserDetails {
  id: string;
  full_name: string | null;
  graduation_year: number | null;
}

export default defineEventHandler(async (event) => {
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

    // Fetch family unit details
    const { data: families, error: familiesError } = await supabase
      .from("family_units")
      .select("id, player_user_id, family_name")
      .in("id", familyUnitIds);

    if (familiesError) {
      logger.error("Failed to fetch family units", familiesError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch accessible families" });
    }

    // Get player user IDs and fetch user details separately
    const playerUserIds = families?.map((f) => f.player_user_id) || [];
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, graduation_year")
      .in("id", playerUserIds);

    if (usersError) {
      logger.error("Failed to fetch user details", usersError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch accessible families" });
    }

    // Create a map of user details
    const usersMap = (users || []).reduce(
      (map, user) => {
        map[user.id] = user;
        return map;
      },
      {} as Record<string, UserDetails>,
    );

    logger.debug("Fetched families and users", {
      familyCount: families?.length ?? 0,
      userCount: users?.length ?? 0,
    });

    // Map to response format
    const accessibleFamilies = (families || []).map((family) => {
      const userDetails = usersMap[family.player_user_id];
      return {
        familyUnitId: family.id,
        athleteId: family.player_user_id,
        athleteName: userDetails?.full_name || "Unknown Athlete",
        graduationYear: userDetails?.graduation_year || null,
        familyName: family.family_name || "Family",
      };
    });

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
