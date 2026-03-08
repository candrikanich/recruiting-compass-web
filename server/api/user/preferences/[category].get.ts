/**
 * API Endpoint: Get user preferences by category
 * GET /api/user/preferences/[category]
 *
 * Returns stored preferences for a specific category (e.g., "filters", "session", "display")
 * If no preferences exist for the category, returns empty object
 */

import { defineEventHandler, createError } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const ALLOWED_CATEGORIES = [
  "notifications",
  "location",
  "player",
  "school",
  "dashboard",
] as const;

// Categories where parents should see the linked athlete's data (read-only)
const PLAYER_OWNED_CATEGORIES = new Set(["location", "player", "school"]);

/**
 * Finds the linked athlete's user_id for a parent via family_members.
 * Returns null if no linked athlete is found.
 */
async function getLinkedAthleteId(
  parentUserId: string,
  supabase: ReturnType<typeof useSupabaseAdmin>,
): Promise<string | null> {
  // Find the family unit this parent belongs to
  const { data: parentMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", parentUserId)
    .eq("role", "parent")
    .maybeSingle();

  if (!parentMembership?.family_unit_id) return null;

  // Find the player in the same family unit
  const { data: playerMembership } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", parentMembership.family_unit_id)
    .eq("role", "player")
    .maybeSingle();

  return playerMembership?.user_id ?? null;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "user/preferences");
  // Require authentication
  const user = await requireAuth(event);
  const category = event.context.params?.category;

  if (!category || typeof category !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Category parameter is required",
    });
  }

  if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid category",
    });
  }

  try {
    const supabase = useSupabaseAdmin();

    // For player-owned categories, parents should see the linked athlete's data
    let targetUserId = user.id;
    if (PLAYER_OWNED_CATEGORIES.has(category)) {
      const role = await getUserRole(user.id, supabase);
      if (role === "parent") {
        const athleteId = await getLinkedAthleteId(user.id, supabase);
        if (athleteId) {
          targetUserId = athleteId;
          logger.info("Parent viewing athlete preferences", { category, athleteId });
        }
      }
    }

    // Fetch preferences for the target user and category
    const { data, error } = await supabase
      .from("user_preferences")
      .select("data, updated_at")
      .eq("user_id", targetUserId)
      .eq("category", category)
      .single();

    if (error && error.code === "PGRST116") {
      // No preferences found for this category - return empty
      return {
        category,
        data: {},
        exists: false,
      };
    }

    if (error) {
      throw error;
    }

    return {
      category,
      data: data?.data || {},
      exists: true,
      updatedAt: data?.updated_at,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Error fetching preferences", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch preferences",
    });
  }
});
