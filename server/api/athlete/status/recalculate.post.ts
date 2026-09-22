/**
 * POST /api/athlete/status/recalculate
 * Force recalculation and persist athlete's status score. Family-shared
 * profile — a parent's call is redirected to their linked athlete.
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { useLogger } from "~/server/utils/logger";
import { logCRUD, logError } from "~/server/utils/auditLog";
import type { StatusScoreResult, Phase } from "~/types/timeline";
import { requireAuth } from "~/server/utils/auth";
import { resolveActingAthleteId } from "~/server/utils/playerOwnedPreferences";
import {
  calculateTaskCompletionRate,
  calculateInteractionFrequencyScore,
  calculateCoachInterestScore,
  calculateAcademicStandingScore,
  calculateStatusScoreResult,
} from "~/utils/statusScoreCalculation";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/status/recalculate");
  const user = await requireAuth(event);
  const token = extractRequestToken(event);
  const supabase = createServerSupabaseUserClient(token);

  try {
    const athleteId = await resolveActingAthleteId(user.id, supabase);

    // Get user info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_phase")
      .eq("id", athleteId)
      .single();

    if (userError) {
      logger.error("Error fetching user", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user",
      });
    }

    const userRecord = userData as { current_phase?: Phase };
    const phase = userRecord?.current_phase || "freshman";
    const gradeMap: Record<Phase, number> = {
      freshman: 9,
      sophomore: 10,
      junior: 11,
      senior: 12,
      committed: 12,
    };
    const gradeLevel = gradeMap[phase];

    // Fetch required tasks for current phase
    const { data: requiredTasksData, error: tasksError } = await supabase
      .from("task")
      .select("id")
      .eq("grade_level", gradeLevel)
      .eq("required", true);

    if (tasksError) {
      logger.error("Error fetching required tasks", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch required tasks",
      });
    }

    const requiredTaskIds = (requiredTasksData || []).map(
      (t: { id: string }) => t.id,
    );

    // athlete_task's SELECT policy doesn't yet recognize family_members-linked
    // parents (#926) -- go through a SECURITY DEFINER RPC that does its own
    // self-or-linked-player authorization check instead of a raw .from() read.
    const { data: completedTasksData, error: completedError } =
      await supabase.rpc("get_athlete_completed_task_ids", {
        p_athlete_id: athleteId,
      });

    if (completedError) {
      logger.error("Error fetching completed tasks", completedError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch completed tasks",
      });
    }

    const completedTaskIds = completedTasksData || [];

    // Calculate task completion rate
    const taskCompletionRate = calculateTaskCompletionRate(
      completedTaskIds,
      requiredTaskIds,
    );

    // Fetch all schools and interactions in single query to avoid N+1
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select("id")
      .eq("user_id", athleteId);

    if (schoolsError) {
      logger.error("Error fetching schools", schoolsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch schools",
      });
    }

    const targetSchools = (schoolsData || []).length;

    // Calculate interaction frequency score
    const { data: interactionsData, error: interactionsError } = await supabase
      .from("interactions")
      .select("created_at, sentiment")
      .eq("logged_by", athleteId)
      .order("created_at", { ascending: false });

    // A transient query error must fail the request, not silently score this
    // sub-component as 0 — that zeroed value gets PERSISTED to
    // users.status_score below, permanently depressing the athlete's score
    // for a purely transient DB hiccup.
    if (interactionsError) {
      logger.error("Error fetching interactions", interactionsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch interactions",
      });
    }

    let interactionFrequencyScore = 0;
    let coachInterestScore = 0;

    if (interactionsData && interactionsData.length > 0) {
      const interactionsRecords = interactionsData as Array<{
        created_at: string;
        sentiment?: string;
      }>;

      // Use most recent interaction for frequency scoring
      const lastInteractionDate = interactionsRecords[0].created_at;
      const daysSinceLastInteraction = Math.floor(
        (Date.now() - new Date(lastInteractionDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      interactionFrequencyScore = calculateInteractionFrequencyScore(
        lastInteractionDate,
        daysSinceLastInteraction,
        targetSchools,
      );

      // Calculate coach interest score from all interactions
      // Map sentiment to interest level: positive -> high, negative -> low, neutral/other -> medium
      const interestLevels = interactionsRecords.map((interaction) => {
        const sentiment = interaction.sentiment?.toLowerCase?.();
        if (sentiment === "positive") {
          return "high";
        } else if (sentiment === "negative") {
          return "low";
        } else {
          return "medium";
        }
      });

      coachInterestScore = calculateCoachInterestScore(
        interestLevels as Array<"low" | "medium" | "high">,
        0,
      );
    }

    // Calculate academic standing score from actual user data
    const { data: academicData, error: academicError } = await supabase
      .from("users")
      .select("gpa, sat_score, act_score")
      .eq("id", athleteId)
      .single();

    if (academicError) {
      logger.error("Error fetching academic data", academicError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch academic data",
      });
    }

    const academicRecord = academicData
      ? (academicData as unknown as {
          gpa?: number | null;
          sat_score?: number | null;
          act_score?: number | null;
        })
      : {
          gpa: null,
          sat_score: null,
          act_score: null,
        };

    const academicStandingScore = calculateAcademicStandingScore(
      academicRecord?.gpa ?? null,
      {
        sat: academicRecord?.sat_score ?? undefined,
        act: academicRecord?.act_score ?? undefined,
      },
      "not_started",
      [],
    );

    // Calculate composite score
    const result = calculateStatusScoreResult({
      taskCompletionRate,
      interactionFrequencyScore,
      coachInterestScore,
      academicStandingScore,
    });

    // Column-scoped write via RPC: users has no family-shared UPDATE policy
    // (deliberately -- that table also holds email/role/consent/PII, a
    // blanket grant is a bigger attack surface than this route needs), and
    // no raw .update() call can go through the session client as this user
    // for a linked athlete's row.
    const { error: updateError } = await supabase.rpc(
      "set_athlete_status_score",
      {
        p_athlete_id: athleteId,
        p_score: result.score,
        p_label: result.label,
      },
    );

    if (updateError) {
      logger.error("Error updating status score", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to save status score",
      });
    }

    // Log successful status recalculation
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: athleteId,
      newValues: {
        status_score: result.score,
        status_label: result.label,
      },
      description: `Recalculated status score (${result.label} - ${result.score}/100)`,
    });

    return result as StatusScoreResult;
  } catch (err) {
    // Re-throw H3 errors immediately — they were already logged at their source
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    const errorMessage =
      err instanceof Error ? err.message : "Failed to recalculate status";

    // Only log truly unexpected errors
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      errorMessage,
      description: "Unexpected error recalculating status score",
    });

    logger.error(
      "Unexpected error in POST /api/athlete/status/recalculate",
      err,
    );
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to recalculate status",
    });
  }
});
