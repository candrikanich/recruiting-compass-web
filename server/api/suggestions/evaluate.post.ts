/**
 * POST /api/suggestions/evaluate
 * Trigger rule engine to generate suggestions for athlete
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { RuleEngine } from "~/server/utils/ruleEngine";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import type { RuleContext } from "~/server/utils/rules/index";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";
import { interactionGapRule } from "~/server/utils/rules/interactionGap";
import { missingVideoRule } from "~/server/utils/rules/missingVideo";
import { eventFollowUpRule } from "~/server/utils/rules/eventFollowUp";
import { videoLinkHealthRule } from "~/server/utils/rules/videoLinkHealth";
import { portfolioHealthRule } from "~/server/utils/rules/portfolioHealth";
import { prioritySchoolReminderRule } from "~/server/utils/rules/prioritySchoolReminder";
import { schoolListRule } from "~/server/utils/rules/schoolList";
import { showcaseAttendanceRule } from "~/server/utils/rules/showcaseAttendance";
import { ncaaRegistrationRule } from "~/server/utils/rules/ncaaRegistration";
import { formalOutreachRule } from "~/server/utils/rules/formalOutreach";
import { officialVisitRule } from "~/server/utils/rules/officialVisit";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const logger = useLogger(event, "suggestions/evaluate");

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  const athleteId = user.id;

  try {
    // grade_level is derived from graduation_year in user_preferences
    // (the profiles table was removed — see migration 041).
    const schoolsSelect =
      "id, name, division, status, priority, priority_tier, fit_score";
    const interactionsSelect =
      "id, school_id, interaction_date, related_event_id";
    const athleteTasksSelect = "task_id, status";
    const videosSelect = "id, health_status, title";
    const eventsSelect = "id, name, event_date, school_id, attended";

    const [playerPrefs, schools, interactions, athleteTasks, videos, events] =
      await Promise.all([
        supabase
          .from("user_preferences")
          .select("data")
          .eq("user_id", athleteId)
          .eq("category", "player")
          .single(),
        supabase.from("schools").select(schoolsSelect).eq("user_id", athleteId),
        supabase.from("interactions").select(interactionsSelect).eq("logged_by", athleteId),
        supabase.from("athlete_task").select(athleteTasksSelect).eq("athlete_id", athleteId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("videos").select(videosSelect).eq("athlete_id", athleteId),
        supabase.from("events").select(eventsSelect).eq("user_id", athleteId),
      ]);

    const playerData = playerPrefs.data?.data as Record<string, unknown> | null;
    const graduationYear =
      typeof playerData?.graduation_year === "number"
        ? playerData.graduation_year
        : null;
    const gradeLevel = graduationYear ? calculateCurrentGrade(graduationYear) : 9;

    const context: RuleContext = {
      athleteId,
      athlete: { grade_level: gradeLevel },
      schools: schools.data || [],
      interactions: interactions.data || [],
      tasks: [], // No rule uses context.tasks; avoid fetching entire task table
      athleteTasks: athleteTasks.data || [],
      videos: videos.data || [],
      events: events.data || [],
    };

    const engine = new RuleEngine([
      // Phase-critical rules first
      ncaaRegistrationRule,
      schoolListRule,
      officialVisitRule,
      formalOutreachRule,
      showcaseAttendanceRule,
      // Existing rules
      interactionGapRule,
      missingVideoRule,
      eventFollowUpRule,
      videoLinkHealthRule,
      portfolioHealthRule,
      prioritySchoolReminderRule,
    ]);

    const result = await engine.generateSuggestions(
      supabase,
      athleteId,
      context,
    );

    return { generated: result.count, ids: result.ids };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    logger.error("Failed to evaluate suggestions", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to evaluate suggestions",
    });
  }
});
