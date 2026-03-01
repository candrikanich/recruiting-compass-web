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

    // Fetch player members of these families (only families with a connected player count)
    const { data: playerMembers, error: playerMembersError } = await supabase
      .from("family_members")
      .select("family_unit_id, user_id, users!inner(id, full_name, email)")
      .in("family_unit_id", familyUnitIds)
      .eq("role", "player");

    if (playerMembersError) {
      logger.error("Failed to fetch player members", playerMembersError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch accessible families" });
    }

    logger.debug("Found player members", { count: playerMembers?.length ?? 0 });

    // If no families have a connected player, parent has nothing to view yet
    if (!playerMembers || playerMembers.length === 0) {
      return { success: true, families: [] };
    }

    // Fetch family unit details for families that have players
    const familiesWithPlayers = [...new Set(playerMembers.map((pm) => pm.family_unit_id))];
    const { data: families, error: familiesError } = await supabase
      .from("family_units")
      .select("id, family_name")
      .in("id", familiesWithPlayers);

    if (familiesError) {
      logger.error("Failed to fetch family units", familiesError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch accessible families" });
    }

    logger.debug("Fetched families with players", { familyCount: families?.length ?? 0 });

    // Map each family to its connected player
    const accessibleFamilies = (families || []).flatMap((family) => {
      const players = (playerMembers as Array<{
        family_unit_id: string;
        user_id: string;
        users: { id: string; full_name: string | null; email: string | null };
      }>).filter((pm) => pm.family_unit_id === family.id);

      return players.map((pm) => ({
        familyUnitId: family.id,
        athleteId: pm.user_id,
        athleteName: pm.users.full_name || pm.users.email || "Unknown Athlete",
        graduationYear: null as number | null,
        familyName: family.family_name || "Family",
      }));
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
