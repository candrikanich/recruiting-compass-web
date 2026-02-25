/**
 * GET /api/athlete/portfolio-health
 * Get portfolio health analysis for current athlete
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { calculatePortfolioHealth } from "~/utils/fitScoreCalculation";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/portfolio-health");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    // Get all schools for this user with fit score data
    const { data: schools, error: schoolsError } = await supabase
      .from("schools")
      .select("id, name, fit_score, fit_score_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (schoolsError) {
      logger.error("Failed to fetch schools", schoolsError);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch schools" });
    }

    // Calculate portfolio health
    const portfolioHealth = calculatePortfolioHealth(
      (schools || []).map((school: { fit_score?: number | null }) => ({
        fit_score: school.fit_score ?? 0,
        fit_tier: undefined,
      })),
    );

    return {
      success: true,
      data: {
        portfolio: portfolioHealth,
        schoolCount: schools?.length || 0,
        schools: (schools || []).map(
          (school: {
            id: string;
            name: string;
            fit_score?: number | null;
            fit_score_data?: unknown;
          }) => ({
            id: school.id,
            name: school.name,
            fitScore: school.fit_score,
            fitScoreData: school.fit_score_data,
          }),
        ),
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
