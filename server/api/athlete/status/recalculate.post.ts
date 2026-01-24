/**
 * POST /api/athlete/status/recalculate
 * Force recalculation and persist athlete's status score
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { logCRUD, logError } from "~/server/utils/auditLog";
import type { StatusScoreResult, Phase } from "~/types/timeline";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import {
  calculateTaskCompletionRate,
  calculateInteractionFrequencyScore,
  calculateCoachInterestScore,
  calculateAcademicStandingScore,
  calculateStatusScoreResult,
} from "~/utils/statusScoreCalculation";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  try {
    // Get user info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_phase")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
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
      console.error("Error fetching required tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch required tasks",
      });
    }

    const requiredTaskIds = (requiredTasksData || []).map(
      (t: { id: string }) => t.id,
    );

    // Get completed tasks
    const { data: completedTasksData, error: completedError } = await supabase
      .from("athlete_task")
      .select("task_id")
      .eq("athlete_id", user.id)
      .eq("status", "completed");

    if (completedError) {
      console.error("Error fetching completed tasks:", completedError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch completed tasks",
      });
    }

    const completedTaskIds = (completedTasksData || []).map(
      (at: { task_id: string }) => at.task_id,
    );

    // Calculate task completion rate
    const taskCompletionRate = calculateTaskCompletionRate(
      completedTaskIds,
      requiredTaskIds,
    );

    // Fetch all schools and interactions in single query to avoid N+1
    const { data: schoolsData } = await supabase
      .from("schools")
      .select("id")
      .eq("user_id", user.id);

    const targetSchools = (schoolsData || []).length;

    // Calculate interaction frequency score
    const { data: interactionsData, error: interactionsError } = await supabase
      .from("interactions")
      .select("created_at, sentiment")
      .eq("logged_by", user.id)
      .order("created_at", { ascending: false });

    let interactionFrequencyScore = 0;
    let coachInterestScore = 0;

    if (!interactionsError && interactionsData && interactionsData.length > 0) {
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
    const { data: academicData } = await supabase
      .from("users")
      .select("gpa, sat_score, act_score, ncaa_eligibility_status")
      .eq("id", user.id)
      .single();

    const academicRecord = academicData
      ? (academicData as unknown as {
          gpa?: number | null;
          sat_score?: number | null;
          act_score?: number | null;
          ncaa_eligibility_status?: string | null;
        })
      : {
          gpa: null,
          sat_score: null,
          act_score: null,
          ncaa_eligibility_status: null,
        };

    const academicStandingScore = calculateAcademicStandingScore(
      academicRecord?.gpa ?? null,
      {
        sat: academicRecord?.sat_score ?? undefined,
        act: academicRecord?.act_score ?? undefined,
      },
      (academicRecord?.ncaa_eligibility_status as
        | "registered"
        | "pending"
        | "not_started") ?? "not_started",
      [],
    );

    // Calculate composite score
    const result = calculateStatusScoreResult({
      taskCompletionRate,
      interactionFrequencyScore,
      coachInterestScore,
      academicStandingScore,
    });

    // Persist to database
    // Supabase type generation doesn't include custom columns - need to bypass type check
    const updateResult = await supabase
      .from("users")
      // @ts-expect-error - custom columns (status_score, status_label) not in Supabase types
      .update({
        status_score: result.score,
        status_label: result.label,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    const { error: updateError } = updateResult;

    if (updateError) {
      console.error("Error updating status score:", updateError);
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
      resourceId: user.id,
      newValues: {
        status_score: result.score,
        status_label: result.label,
      },
      description: `Recalculated status score (${result.label} - ${result.score}/100)`,
    });

    return result as StatusScoreResult;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to recalculate status";

    // Log failed status recalculation
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      errorMessage,
      description: "Failed to recalculate status score",
    });

    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    console.error("Error in POST /api/athlete/status/recalculate:", err);
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
    });
  }
});
