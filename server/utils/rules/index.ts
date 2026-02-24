import type { SuggestionData, Suggestion } from "~/types/timeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

export interface RuleContext {
  athleteId: string;
  athlete: unknown;
  schools: unknown[];
  interactions: unknown[];
  tasks: unknown[];
  athleteTasks: unknown[];
  videos: unknown[];
  events: unknown[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  evaluate: (
    context: RuleContext,
  ) => Promise<SuggestionData | SuggestionData[] | null>;

  /**
   * Optional: Determines if a dismissed suggestion should be re-evaluated.
   * Called when checking if a dismissed suggestion's condition has worsened significantly.
   *
   * @param dismissedSuggestion The dismissed suggestion to check for re-evaluation
   * @param context The current rule evaluation context
   * @returns true if the suggestion should be re-evaluated (recreated), false otherwise
   */
  shouldReEvaluate?: (
    dismissedSuggestion: Suggestion,
    context: RuleContext,
  ) => Promise<boolean>;

  /**
   * Optional: Creates a snapshot of the rule condition state at the time the suggestion was created.
   * Used for comparing against current state during re-evaluation to determine if conditions worsened.
   *
   * @param context The current rule evaluation context
   * @param relatedSchoolId Optional school ID for school-related rules
   * @returns An object containing the snapshot of relevant condition state
   */
  createConditionSnapshot?: (
    context: RuleContext,
    relatedSchoolId?: string,
  ) => Record<string, unknown>;
}

/**
 * Checks for an existing active (non-dismissed, non-completed) suggestion within the dedup
 * window. Returns the existing suggestion's id and message when found, or null when not found.
 * Callers can use the returned id to update a stale message rather than inserting a duplicate.
 */
export async function findExistingSuggestion(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  suggestion: SuggestionData,
  daysWindow: number = 7,
): Promise<{ id: string; message: string | null } | null> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow);

  let query = supabase
    .from("suggestion")
    .select("id, message")
    .eq("athlete_id", athleteId)
    .eq("rule_type", suggestion.rule_type)
    .eq("dismissed", false)
    .eq("completed", false)
    .gte("created_at", cutoffDate.toISOString());

  // For school-related rules, check per-school to allow multiple reminders simultaneously
  if (suggestion.related_school_id) {
    query = query.eq("related_school_id", suggestion.related_school_id);
  }

  const { data, error } = await query.limit(1);

  if (error || !data || data.length === 0) return null;
  return { id: data[0].id, message: data[0].message };
}

/** @deprecated Use findExistingSuggestion instead */
export async function isDuplicateSuggestion(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  suggestion: SuggestionData,
  daysWindow: number = 7,
): Promise<boolean> {
  const existing = await findExistingSuggestion(
    supabase,
    athleteId,
    suggestion,
    daysWindow,
  );
  return existing !== null;
}
