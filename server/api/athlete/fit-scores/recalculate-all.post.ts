/**
 * POST /api/athlete/fit-scores/recalculate-all
 * Batch recalculate fit scores for all user schools when athlete profile changes
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { calculateFitScore } from "~/utils/fitScoreCalculation";
import { logCRUD, logError } from "~/server/utils/auditLog";
import type { PlayerDetails } from "~/types/models";
import type { FitScoreInputs } from "~/types/timeline";

interface RecalculationResult {
  success: boolean;
  updated: number;
  failed: number;
  message: string;
}

export default defineEventHandler(
  async (event): Promise<RecalculationResult> => {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    // Ensure requesting user is not a parent (mutation restricted)
    await assertNotParent(user.id, supabase);

    try {
      // Fetch user's player details from user_preferences
      const { data: preferences, error: prefError } = await supabase
        .from("user_preferences")
        .select("player_details")
        .eq("user_id", user.id)
        .single();

      if (prefError) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Player details not configured. Add athlete profile data first.",
        });
      }

      const playerDetails = preferences?.player_details as PlayerDetails | null;

      if (!playerDetails) {
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
          // Map player_details to fit score calculation inputs
          const fitScoreInputs: FitScoreInputs = {
            athleticFit: playerDetails.positions?.[0] ? 20 : 0, // Simplified: has position = baseline
            academicFit: playerDetails.gpa ? 15 : 0, // Simplified: has GPA = baseline
            opportunityFit: 10, // Baseline
            personalFit: 8, // Baseline
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
          console.error(
            `Failed to calculate fit score for school ${school.id}:`,
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

      // Batch update schools table
      const { data: updateResult, error: updateError } = await supabase
        .from("schools")
        // @ts-expect-error - custom columns (fit_score, fit_score_data) not in Supabase types
        .upsert(updates, { onConflict: "id" })
        .select();

      if (updateError) {
        throw updateError;
      }

      // Log successful batch update
      await logCRUD(event, {
        userId: user.id,
        action: "UPDATE",
        resourceType: "schools",
        resourceId: "*",
        newValues: {
          fit_scores_recalculated: updates.length,
        },
        description: `Batch recalculated fit scores for ${updates.length} schools`,
      });

      return {
        success: true,
        updated: updates.length,
        failed: schools.length - updates.length,
        message: `Updated fit scores for ${updates.length} school${updates.length !== 1 ? "s" : ""}`,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to recalculate fit scores";

      // Log failed batch update
      await logError(event, {
        userId: user.id,
        action: "UPDATE",
        resourceType: "schools",
        resourceId: "*",
        errorMessage,
        description: "Failed to batch recalculate fit scores",
      });

      if (err instanceof Error && "statusCode" in err) {
        throw err;
      }
      console.error("Fit score batch recalculation error:", err);
      throw createError({
        statusCode: 500,
        statusMessage: errorMessage,
      });
    }
  },
);
