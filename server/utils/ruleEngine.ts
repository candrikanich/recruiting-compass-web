import type { Rule, RuleContext } from "./rules/index";
import { isDuplicateSuggestion } from "./rules/index";
import type { SuggestionData, Suggestion, Urgency } from "~/types/timeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDeadPeriod } from "./ncaaRecruitingCalendar";
import { escalateUrgency } from "./rules/ruleEngineHelpers";

const CONTACT_RULES = [
  "interaction-gap",
  "priority-school-reminder",
  "event-follow-up",
];

function isContactRule(ruleId: string): boolean {
  return CONTACT_RULES.includes(ruleId);
}

export class RuleEngine {
  private rules: Rule[] = [];

  constructor(rules: Rule[] = []) {
    this.rules = rules;
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  async evaluateAll(context: RuleContext): Promise<SuggestionData[]> {
    const suggestions: SuggestionData[] = [];
    const now = new Date();

    for (const rule of this.rules) {
      try {
        // Skip contact-related rules during NCAA dead periods
        if (isContactRule(rule.id)) {
          // Check if any schools are in dead period
          const schoolsInDeadPeriod = (context.schools as unknown[]).filter(
            (s: unknown) => {
              const school = s as Record<string, unknown>;
              const division = (school.division as string | null) || "D1";
              return isDeadPeriod(now, division as "D1" | "D2" | "D3");
            },
          );

          // If all schools are in dead period, skip this rule
          if (
            schoolsInDeadPeriod.length > 0 &&
            schoolsInDeadPeriod.length === context.schools.length
          ) {
            console.log(
              `Skipping ${rule.id} rule - dead period active for all schools`,
            );
            continue;
          }
        }

        const result = await rule.evaluate(context);
        if (result) {
          if (Array.isArray(result)) {
            suggestions.push(...result);
          } else {
            suggestions.push(result);
          }
        }
      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error);
      }
    }

    return suggestions;
  }

  private async reEvaluateDismissedSuggestions(
    supabase: SupabaseClient,
    athleteId: string,
    context: RuleContext,
  ): Promise<SuggestionData[]> {
    const reappearingSuggestions: SuggestionData[] = [];

    // Fetch dismissed suggestions that are old enough for re-evaluation
    const { data: dismissedSuggestions, error: fetchError } = await supabase
      .from("suggestion")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("dismissed", true)
      .eq("reappeared", false)
      .lte("dismissed_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError || !dismissedSuggestions) {
      console.error("Failed to fetch dismissed suggestions:", fetchError);
      return [];
    }

    // Group dismissed suggestions by rule type
    const suggestionsByRuleType = dismissedSuggestions.reduce(
      (acc: Record<string, Suggestion[]>, sugg: unknown) => {
        const suggestion = sugg as Suggestion;
        if (!acc[suggestion.rule_type]) {
          acc[suggestion.rule_type] = [];
        }
        acc[suggestion.rule_type].push(suggestion);
        return acc;
      },
      {},
    );

    // Check each rule if it has re-evaluation support
    for (const rule of this.rules) {
      if (!rule.shouldReEvaluate) {
        continue;
      }

      const dismissedForThisRule = suggestionsByRuleType[rule.id] || [];

      for (const dismissedSuggestion of dismissedForThisRule) {
        try {
          // Check if this dismissed suggestion should be re-evaluated
          const shouldReEvaluate = await rule.shouldReEvaluate(
            dismissedSuggestion,
            context,
          );

          if (shouldReEvaluate) {
            // Re-evaluate the rule to get current suggestion data
            const currentResult = await rule.evaluate(context);

            if (currentResult) {
              const currentSuggestions = Array.isArray(currentResult)
                ? currentResult
                : [currentResult];

              // Find the corresponding suggestion for the dismissed school
              const relatedSuggestion = currentSuggestions.find((s) => {
                if (dismissedSuggestion.related_school_id) {
                  return s.related_school_id === dismissedSuggestion.related_school_id;
                }
                return s.rule_type === dismissedSuggestion.rule_type;
              });

              if (relatedSuggestion) {
                // Escalate urgency and mark as reappeared
                reappearingSuggestions.push({
                  ...relatedSuggestion,
                  urgency: escalateUrgency(relatedSuggestion.urgency as Urgency),
                  reappeared: true,
                  previous_suggestion_id: dismissedSuggestion.id,
                  condition_snapshot:
                    rule.createConditionSnapshot?.(
                      context,
                      dismissedSuggestion.related_school_id,
                    ) || null,
                });
              }
            }
          }
        } catch (error) {
          console.error(
            `Re-evaluation failed for dismissed suggestion ${dismissedSuggestion.id}:`,
            error,
          );
        }
      }
    }

    return reappearingSuggestions;
  }

  async generateSuggestions(
    supabase: SupabaseClient,
    athleteId: string,
    context: RuleContext,
  ): Promise<{ count: number; ids: string[] }> {
    // Get new suggestions from normal rule evaluation
    const suggestions = await this.evaluateAll(context);

    // Check for dismissed suggestions that should re-evaluate
    const reappearingSuggestions = await this.reEvaluateDismissedSuggestions(
      supabase,
      athleteId,
      context,
    );

    // Combine both regular and re-evaluated suggestions
    const allSuggestions = [...suggestions, ...reappearingSuggestions];
    const insertedIds: string[] = [];

    for (const suggestion of allSuggestions) {
      const isDuplicate = await isDuplicateSuggestion(
        supabase,
        athleteId,
        suggestion,
      );

      if (!isDuplicate) {
        const { data, error } = await supabase
          .from("suggestion")
          .insert({
            athlete_id: athleteId,
            ...suggestion,
            pending_surface: true,
          })
          .select("id")
          .single();

        if (!error && data?.id) {
          insertedIds.push(data.id);
        } else {
          console.error("Failed to insert suggestion:", error);
        }
      }
    }

    return { count: insertedIds.length, ids: insertedIds };
  }
}
