/**
 * POST /api/suggestions/evaluate
 * Trigger rule engine to generate suggestions for athlete
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { RuleEngine } from "~/server/utils/ruleEngine";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import type { RuleContext } from "~/server/utils/rules/index";
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

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  const athleteId = user.id;

  try {
    const [
      athlete,
      schools,
      interactions,
      tasks,
      athleteTasks,
      videos,
      events,
    ] = await Promise.all([
      supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("profiles" as any)
        .select("*")
        .eq("id", athleteId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .single() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("schools").select("*").eq("athlete_id", athleteId) as any,
      supabase
        .from("interactions")
        .select("*")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("athlete_id", athleteId) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("task").select("*") as any,
      supabase
        .from("athlete_task")
        .select("*")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("athlete_id", athleteId) as any,
      supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("videos" as any)
        .select("*")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("athlete_id", athleteId) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("events").select("*").eq("athlete_id", athleteId) as any,
    ]);

    const context: RuleContext = {
      athleteId,
      athlete: athlete.data,
      schools: schools.data || [],
      interactions: interactions.data || [],
      tasks: tasks.data || [],
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await engine.generateSuggestions(
      supabase,
      athleteId,
      context,
    );

    return { generated: result.count, ids: result.ids };
  } catch (error: unknown) {
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to evaluate suggestions",
    });
  }
});
