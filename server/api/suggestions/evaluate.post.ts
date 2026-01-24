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
      supabase.from("profiles").select("*").eq("id", athleteId).single(),
      supabase.from("schools").select("*").eq("athlete_id", athleteId),
      supabase.from("interactions").select("*").eq("athlete_id", athleteId),
      supabase.from("task").select("*"),
      supabase.from("athlete_task").select("*").eq("athlete_id", athleteId),
      supabase.from("videos").select("*").eq("athlete_id", athleteId),
      supabase.from("events").select("*").eq("athlete_id", athleteId),
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
      interactionGapRule,
      missingVideoRule,
      eventFollowUpRule,
      videoLinkHealthRule,
      portfolioHealthRule,
      prioritySchoolReminderRule,
    ]);

    const count = await engine.generateSuggestions(
      supabase,
      athleteId,
      context,
    );

    return { generated: count };
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
