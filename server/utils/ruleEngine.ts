import type { Rule, RuleContext } from "./rules/index";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("rule-engine");
import { findExistingSuggestion } from "./rules/index";
import type { SuggestionData, Suggestion, Urgency } from "~/types/timeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isDeadPeriod,
  NO_SPORT_FALLBACK,
  type AppSport,
} from "~/utils/recruitingCalendar";
import { escalateUrgency } from "./rules/ruleEngineHelpers";

const CONTACT_RULES = [
  "interaction-gap",
  "priority-school-reminder",
  "event-follow-up",
];

function isContactRule(ruleId: string): boolean {
  return CONTACT_RULES.includes(ruleId);
}

/**
 * Stable identity for an active suggestion: its rule type plus the school it
 * targets (dashboard-level rules have no school). Used to decide whether a
 * stored active row is still backed by a currently-firing rule.
 */
function suggestionKey(
  ruleType: string,
  relatedSchoolId: string | null | undefined,
): string {
  return `${ruleType}::${relatedSchoolId ?? ""}`;
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
    return (await this.evaluateAllTracked(context)).suggestions;
  }

  /**
   * Runs every rule and reports both the produced suggestions and which rule
   * types were actually evaluated to a conclusion this run. A rule that is
   * skipped (dead period) or throws is NOT reported as succeeded, so stale
   * invalidation never retires rows for a rule whose current state is unknown.
   */
  private async evaluateAllTracked(
    context: RuleContext,
  ): Promise<{ suggestions: SuggestionData[]; succeededRuleTypes: string[] }> {
    const suggestions: SuggestionData[] = [];
    const succeededRuleTypes: string[] = [];
    const now = new Date();

    // Sport-aware NCAA calendars are keyed by AppSport; a context built
    // without a sport (legacy callers, sport-agnostic rule tests) falls back
    // to NO_SPORT_FALLBACK.
    const sport: AppSport = context.sport ?? NO_SPORT_FALLBACK;
    const gender = context.gender;

    for (const rule of this.rules) {
      try {
        // Skip contact-related rules during NCAA dead periods
        if (isContactRule(rule.id)) {
          // Check if any schools are in dead period
          const schoolsInDeadPeriod = (context.schools as unknown[]).filter(
            (s: unknown) => {
              const school = s as Record<string, unknown>;
              const division = ((school.division as string | null) || "D1") as
                "D1" | "D2" | "D3";
              return isDeadPeriod(now, sport, division, { gender });
            },
          );

          // If all schools are in dead period, skip this rule
          if (
            schoolsInDeadPeriod.length > 0 &&
            schoolsInDeadPeriod.length === context.schools.length
          ) {
            logger.info(
              `Skipping ${rule.id} rule - dead period active for all schools`,
            );
            continue;
          }
        }

        const result = await rule.evaluate(context);
        succeededRuleTypes.push(rule.id);
        if (result) {
          if (Array.isArray(result)) {
            suggestions.push(...result);
          } else {
            suggestions.push(result);
          }
        }
      } catch (error) {
        logger.error(`Rule ${rule.id} failed:`, error);
      }
    }

    return { suggestions, succeededRuleTypes };
  }

  /**
   * Retires active suggestions that are no longer backed by a currently-firing
   * rule. Without this, a suggestion outlives the condition that created it —
   * e.g. a "You have 1 school" row persisting after the list grew to 53. Only
   * rules that were evaluated this run (succeededRuleTypes) are considered, so
   * a skipped or failed rule never causes false retirement.
   */
  private async invalidateStaleSuggestions(
    supabase: SupabaseClient,
    athleteId: string,
    validKeys: Set<string>,
    succeededRuleTypes: string[],
  ): Promise<number> {
    if (succeededRuleTypes.length === 0) return 0;

    const { data: activeRows, error } = await supabase
      .from("suggestion")
      .select("id, rule_type, related_school_id")
      .eq("athlete_id", athleteId)
      .eq("completed", false)
      .eq("dismissed", false)
      .in("rule_type", succeededRuleTypes);

    if (error || !activeRows) {
      if (error) logger.error("Failed to fetch active suggestions:", error);
      return 0;
    }

    const staleIds = (activeRows as unknown[])
      .map(
        (r) =>
          r as {
            id: string;
            rule_type: string;
            related_school_id: string | null;
          },
      )
      .filter(
        (row) =>
          !validKeys.has(suggestionKey(row.rule_type, row.related_school_id)),
      )
      .map((row) => row.id);

    if (staleIds.length === 0) return 0;

    const { error: retireError } = await supabase
      .from("suggestion")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .in("id", staleIds);

    if (retireError) {
      logger.error("Failed to retire stale suggestions:", retireError);
      return 0;
    }

    return staleIds.length;
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
      .lte(
        "dismissed_at",
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (fetchError || !dismissedSuggestions) {
      logger.error("Failed to fetch dismissed suggestions:", fetchError);
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
                  return (
                    s.related_school_id ===
                    dismissedSuggestion.related_school_id
                  );
                }
                return s.rule_type === dismissedSuggestion.rule_type;
              });

              if (relatedSuggestion) {
                // Escalate urgency and mark as reappeared
                reappearingSuggestions.push({
                  ...relatedSuggestion,
                  urgency: escalateUrgency(
                    relatedSuggestion.urgency as Urgency,
                  ),
                  reappeared: true,
                  previous_suggestion_id: dismissedSuggestion.id,
                  condition_snapshot:
                    rule.createConditionSnapshot?.(
                      context,
                      dismissedSuggestion.related_school_id ?? undefined,
                    ) ?? undefined,
                });
              }
            }
          }
        } catch (error) {
          logger.error(
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
    const { suggestions, succeededRuleTypes } =
      await this.evaluateAllTracked(context);

    // Check for dismissed suggestions that should re-evaluate
    const reappearingSuggestions = await this.reEvaluateDismissedSuggestions(
      supabase,
      athleteId,
      context,
    );

    // Combine both regular and re-evaluated suggestions
    const allSuggestions = [...suggestions, ...reappearingSuggestions];
    const insertedIds: string[] = [];

    // The keys still backed by a currently-firing rule. Anything active under a
    // rule that ran this pass but is NOT in this set is stale and gets retired.
    const validKeys = new Set(
      allSuggestions.map((s) =>
        suggestionKey(s.rule_type, s.related_school_id),
      ),
    );

    for (const suggestion of allSuggestions) {
      const existing = await findExistingSuggestion(
        supabase,
        athleteId,
        suggestion,
      );

      if (!existing) {
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
          logger.error("Failed to insert suggestion:", error);
        }
      } else if (
        suggestion.message &&
        existing.message !== suggestion.message
      ) {
        // Suggestion already exists but count/context has changed — update the message in place
        const { error } = await supabase
          .from("suggestion")
          .update({ message: suggestion.message })
          .eq("id", existing.id);

        if (error) {
          logger.error("Failed to update suggestion message:", error);
        }
      }
    }

    // Retire active rows whose backing rule ran but no longer produces them.
    await this.invalidateStaleSuggestions(
      supabase,
      athleteId,
      validKeys,
      succeededRuleTypes,
    );

    return { count: insertedIds.length, ids: insertedIds };
  }
}
