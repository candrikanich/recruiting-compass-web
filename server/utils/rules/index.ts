import type { SuggestionData } from "~/types/timeline";
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
  evaluate: (context: RuleContext) => Promise<SuggestionData | null>;
}

export async function isDuplicateSuggestion(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  suggestion: SuggestionData,
  daysWindow: number = 7,
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow);

  const { data, error } = await supabase
    .from("suggestion")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("rule_type", suggestion.rule_type)
    .gte("created_at", cutoffDate.toISOString())
    .limit(1);

  return !error && data && data.length > 0;
}
