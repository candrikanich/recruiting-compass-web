/**
 * Centralized utility to trigger suggestion re-evaluation
 * Called when:
 * - Profile data changes (profile_change)
 * - Interactions are logged (interaction_logged)
 * - Daily refresh runs (daily_refresh)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { RuleEngine } from "./ruleEngine";
import { surfacePendingSuggestions } from "./suggestionStaggering";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";
import { createLogger } from "~/server/utils/logger";
import type { RuleContext } from "./rules/index";
import type { AppSport } from "~/utils/recruitingCalendar";
import { interactionGapRule } from "./rules/interactionGap";
import { missingVideoRule } from "./rules/missingVideo";
import { eventFollowUpRule } from "./rules/eventFollowUp";
import { videoLinkHealthRule } from "./rules/videoLinkHealth";
import { prioritySchoolReminderRule } from "./rules/prioritySchoolReminder";
import { schoolListRule } from "./rules/schoolList";
import { showcaseAttendanceRule } from "./rules/showcaseAttendance";
import { ncaaRegistrationRule } from "./rules/ncaaRegistration";
import { formalOutreachRule } from "./rules/formalOutreach";
import { officialVisitRule } from "./rules/officialVisit";

export interface TriggerUpdateResult {
  generated: number;
  surfaced: number;
  reason: "profile_change" | "interaction_logged" | "daily_refresh";
}

export interface TriggerUpdateOptions {
  interactionSchoolId?: string;
  interactionCoachId?: string;
}

/**
 * Triggers suggestion re-evaluation for an athlete
 * Generates new suggestions and automatically surfaces pending ones
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete ID to re-evaluate
 * @param reason - Reason for trigger (profile_change | interaction_logged | daily_refresh)
 * @param options - Optional context data (e.g., interaction details)
 * @returns Result with counts of generated and surfaced suggestions
 */
const logger = createLogger("cron/trigger-suggestion-update");

export async function triggerSuggestionUpdate(
  supabase: SupabaseClient,
  athleteId: string,
  reason: "profile_change" | "interaction_logged" | "daily_refresh",
  options?: TriggerUpdateOptions,
): Promise<TriggerUpdateResult> {
  try {
    // Fetch all athlete data required for rule evaluation.
    // grade_level is derived from graduation_year stored in user_preferences
    // (the profiles table was removed — see migration 041).
    // Schools and interactions are owned by family_unit_id under the family-symmetric
    // model (see idx_schools_family_unit_id / idx_interactions_family_unit_id), NOT by
    // the athlete's user_id. Scoping by user_id/logged_by here undercounted family-owned
    // rows — e.g. a 53-school family list was read as 1, producing a bogus
    // "You have 1 schools on your list" suggestion. Resolve the family unit first, then
    // scope those two queries to it (falling back to the legacy per-user filter only when
    // the athlete has no family membership).
    const { data: memberRow } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", athleteId)
      .maybeSingle();
    const familyUnitId = memberRow?.family_unit_id ?? null;

    const schoolsQuery = familyUnitId
      ? supabase.from("schools").select("*").eq("family_unit_id", familyUnitId)
      : supabase.from("schools").select("*").eq("user_id", athleteId);
    const interactionsQuery = familyUnitId
      ? supabase
          .from("interactions")
          .select("*")
          .eq("family_unit_id", familyUnitId)
      : supabase.from("interactions").select("*").eq("logged_by", athleteId);

    const [
      playerPrefs,
      schools,
      interactions,
      tasks,
      athleteTasks,
      videos,
      events,
    ] = await Promise.all([
      supabase
        .from("user_preferences")
        .select("data")
        .eq("user_id", athleteId)
        .eq("category", "player")
        .single(),
      schoolsQuery,
      interactionsQuery,
      supabase.from("task").select("*"),
      supabase.from("athlete_task").select("*").eq("athlete_id", athleteId),
      supabase
        .from("video_links")
        .select("id, health_status, title")
        .eq("user_id", athleteId),
      supabase.from("events").select("*").eq("user_id", athleteId),
    ]);

    const playerData = playerPrefs.data?.data as Record<string, unknown> | null;
    const graduationYear =
      typeof playerData?.graduation_year === "number"
        ? playerData.graduation_year
        : null;
    const gradeLevel = graduationYear
      ? calculateCurrentGrade(graduationYear)
      : 9;
    const sport =
      typeof playerData?.primary_sport === "string"
        ? (playerData.primary_sport as AppSport)
        : undefined;
    const gender =
      typeof playerData?.gender === "string"
        ? (playerData.gender as string)
        : null;

    const context: RuleContext = {
      athleteId,
      athlete: { grade_level: gradeLevel },
      schools: schools.data || [],
      interactions: interactions.data || [],
      tasks: tasks.data || [],
      athleteTasks: athleteTasks.data || [],
      videos: videos.data || [],
      events: events.data || [],
      sport,
      gender,
    };

    // Initialize rule engine with all rules
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
      prioritySchoolReminderRule,
    ]);

    // If interaction was just logged, mark matching suggestions as completed
    if (reason === "interaction_logged" && options) {
      const { interactionSchoolId, interactionCoachId } = options;

      // Find and complete "log_interaction" type suggestions that match this interaction
      if (interactionSchoolId || interactionCoachId) {
        const { data: matchingSuggestions } = await supabase
          .from("suggestion")
          .select("id")
          .eq("athlete_id", athleteId)
          .eq("action_type", "log_interaction")
          .eq("completed", false);

        if (matchingSuggestions && matchingSuggestions.length > 0) {
          const suggestionIds = matchingSuggestions.map((s) => s.id);

          await supabase
            .from("suggestion")
            .update({ completed: true, completed_at: new Date().toISOString() })
            .in("id", suggestionIds);
        }
      }
    }

    // Generate new suggestions via rule engine
    const generateResult = await engine.generateSuggestions(
      supabase,
      athleteId,
      context,
    );

    // Surface pending suggestions (up to 3)
    const surfacedCount = await surfacePendingSuggestions(
      supabase,
      athleteId,
      3,
    );

    logger.info(
      `Suggestion update triggered for athlete ${athleteId} (reason: ${reason}): ${generateResult.count} generated, ${surfacedCount} surfaced`,
    );

    return {
      generated: generateResult.count,
      surfaced: surfacedCount,
      reason,
    };
  } catch (error) {
    logger.error(
      `Failed to trigger suggestion update for athlete ${athleteId}`,
      error,
    );
    throw error;
  }
}
