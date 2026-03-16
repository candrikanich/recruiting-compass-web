/**
 * GET /api/athlete/portfolio-health
 * Get portfolio health analysis for current athlete
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { calculatePortfolioHealth } from "~/utils/fitScoreCalculation";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/portfolio-health");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    // Resolve the athlete ID: parents view their linked player's data
    let athleteId = user.id;
    const role = await getUserRole(user.id, supabase);
    if (role === "parent") {
      const { data: familyMembership } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", user.id)
        .eq("role", "parent")
        .maybeSingle();

      if (familyMembership) {
        const { data: playerMember } = await supabase
          .from("family_members")
          .select("user_id")
          .eq("family_unit_id", familyMembership.family_unit_id)
          .eq("role", "player")
          .maybeSingle();

        if (playerMember?.user_id) {
          athleteId = playerMember.user_id;
        }
      }
    }

    // Get all schools for this user
    const { data: schools, error: schoolsError } = await supabase
      .from("schools")
      .select("id, name")
      .eq("user_id", athleteId)
      .order("created_at", { ascending: false });

    if (schoolsError) {
      logger.error("Failed to fetch schools", schoolsError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch schools" });
    }

    // Calculate portfolio health — fit scores are no longer stored; pass 0 for all schools
    const portfolioHealth = calculatePortfolioHealth(
      (schools || []).map(() => ({
        fit_score: 0,
        fit_tier: undefined,
      })),
    );

    return {
      success: true,
      data: {
        portfolio: portfolioHealth,
        schoolCount: schools?.length || 0,
        schools: (schools || []).map((school: { id: string; name: string }) => ({
          id: school.id,
          name: school.name,
          fitScore: null,
          fitScoreData: null,
        })),
      },
    };
  } catch (err: unknown) {
    logger.error("Portfolio health error", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to calculate portfolio health",
    });
  }
});
