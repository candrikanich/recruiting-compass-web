/**
 * POST /api/athlete/fit-scores/recalculate-all
 * Batch recalculate fit scores for all user schools when athlete profile changes
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import {
  calculateFitScore,
  calculateAthleticFit,
  calculateAcademicFit,
  calculateOpportunityFit,
  calculatePersonalFit,
} from "~/utils/fitScoreCalculation";
import { logCRUD } from "~/server/utils/auditLog";
import type { PlayerDetails } from "~/types/models";
import type { FitScoreInputs } from "~/types/timeline";
import type { Json } from "~/types/database";

interface RecalculationResult {
  success: boolean;
  updated: number;
  failed: number;
  message: string;
}

export default defineEventHandler(
  async (event): Promise<RecalculationResult> => {
    const logger = useLogger(event, "athlete/fit-scores");
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    // Ensure requesting user is not a parent (mutation restricted)
    await assertNotParent(user.id, supabase);

    try {
      // Fetch user's player details from V2 preferences (category-based)
      logger.info("Fetching player details", { userId: user.id });

      const { data: playerPrefs, error: prefError } = await supabase
        .from("user_preferences")
        .select("data")
        .eq("user_id", user.id)
        .eq("category", "player")
        .single();

      logger.debug("Player preferences query result", {
        found: !!playerPrefs,
        error: prefError?.message,
      });

      if (prefError) {
        logger.error("DB error fetching player preferences", prefError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch player details",
        });
      }
      if (!playerPrefs) {
        logger.warn("Player preferences not found for user", {
          userId: user.id,
        });
        throw createError({
          statusCode: 400,
          statusMessage:
            "Player details not configured. Add athlete profile data first.",
        });
      }

      const playerDetails = (playerPrefs.data || {}) as Partial<PlayerDetails>;

      logger.debug(
        `Player details keys: ${Object.keys(playerDetails).join(", ")}`,
      );

      if (!playerDetails || Object.keys(playerDetails).length === 0) {
        logger.warn("Player details empty or incomplete", { userId: user.id });
        throw createError({
          statusCode: 400,
          statusMessage:
            "Player details not found. Add athlete profile data first.",
        });
      }

      // Fetch ALL user's schools
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, name, user_id, academic_info")
        .eq("user_id", user.id);

      if (schoolsError) {
        throw schoolsError;
      }

      // If no schools, return success with 0 updated
      if (!schools || schools.length === 0) {
        return {
          success: true,
          updated: 0,
          failed: 0,
          message: "No schools found to recalculate",
        };
      }

      // Calculate fit scores for each school
      const updates: Array<{
        id: string;
        fit_score: number;
        fit_score_data: FitScoreInputs;
        updated_at: string;
      }> = [];

      for (const school of schools) {
        try {
          // Extract school academic info
          const academicInfo =
            typeof school.academic_info === "object" &&
            school.academic_info !== null
              ? (school.academic_info as {
                  gpa_requirement?: number;
                  avg_sat?: number;
                  avg_act?: number;
                  student_size?: number;
                  state?: string;
                  tuition_in_state?: number;
                  tuition_out_of_state?: number;
                  majors?: string[];
                })
              : {};

          // Calculate each dimension using actual player data
          const athleticFit = calculateAthleticFit(
            playerDetails.primary_position || null,
            playerDetails.height_inches || null,
            playerDetails.weight_lbs || null,
            null, // velo - would need performance_metrics table
            [], // school position needs - would need to be stored
            "low", // coach interest - would need interactions data
            50, // roster depth - default
          );

          const academicFit = calculateAcademicFit(
            playerDetails.gpa || null,
            playerDetails.sat_score || null,
            playerDetails.act_score || null,
            academicInfo.gpa_requirement || null,
            academicInfo.avg_sat || null,
            academicInfo.avg_act || null,
            null, // target major - would need to be stored
            academicInfo.majors || [],
          );

          const opportunityFit = calculateOpportunityFit(
            50, // roster depth - would need to be tracked
            3, // years to graduate - would need to be tracked
            "medium", // scholarship availability - would need to be tracked
            false, // walk-on history - would need to be tracked
          );

          const personalFit = calculatePersonalFit(
            playerDetails.school_state || null,
            academicInfo.state || null,
            "medium", // campus size preference - would need to be stored
            academicInfo.student_size || 10000,
            "medium", // cost sensitivity - would need to be stored
            academicInfo.tuition_out_of_state ||
              academicInfo.tuition_in_state ||
              30000,
            false, // is priority school - would need school.priority field
            5, // major strength rating - would need to be stored
          );

          // Map to fit score inputs
          const fitScoreInputs: FitScoreInputs = {
            athleticFit,
            academicFit,
            opportunityFit,
            personalFit,
          };

          // Calculate combined fit score
          const fitScoreResult = calculateFitScore(fitScoreInputs);

          updates.push({
            id: school.id,
            fit_score: fitScoreResult.score,
            fit_score_data: fitScoreResult.breakdown,
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          logger.error(
            `Failed to calculate fit score for school ${school.id}`,
            err,
          );
          // Continue with other schools on error
        }
      }

      // If no successful calculations, return error
      if (updates.length === 0) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to calculate fit scores for any schools",
        });
      }

      // Batch update schools table - update each school individually
      const updatePromises = updates.map((update) =>
        supabase
          .from("schools")
          .update({
            fit_score: update.fit_score,
            fit_score_data: update.fit_score_data as unknown as Json,
            updated_at: update.updated_at,
          })
          .eq("id", update.id)
          .select(),
      );

      const results = await Promise.all(updatePromises);
      const updateError = results.find((r) => r.error)?.error;

      if (updateError) {
        throw updateError;
      }

      // Log successful batch update (use first school ID or skip if none)
      if (updates.length > 0) {
        await logCRUD(event, {
          userId: user.id,
          action: "UPDATE",
          resourceType: "schools",
          resourceId: updates[0].id,
          newValues: {
            fit_scores_recalculated: updates.length,
            school_ids: updates.map((u) => u.id),
          },
          description: `Batch recalculated fit scores for ${updates.length} schools`,
        });
      }

      return {
        success: true,
        updated: updates.length,
        failed: schools.length - updates.length,
        message: `Updated fit scores for ${updates.length} school${updates.length !== 1 ? "s" : ""}`,
      };
    } catch (err: unknown) {
      logger.error("Fit score recalculation failed", err);

      if (err instanceof Error && "statusCode" in err) {
        throw err;
      }
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to recalculate fit scores",
      });
    }
  },
);
