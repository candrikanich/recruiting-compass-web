import type { Rule, RuleContext } from "./rules/index";
import { isDuplicateSuggestion } from "./rules/index";
import type { SuggestionData } from "~/types/timeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDeadPeriod } from "./ncaaRecruitingCalendar";

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

  async generateSuggestions(
    supabase: SupabaseClient,
    athleteId: string,
    context: RuleContext,
  ): Promise<number> {
    const suggestions = await this.evaluateAll(context);
    let insertedCount = 0;

    for (const suggestion of suggestions) {
      const isDuplicate = await isDuplicateSuggestion(
        supabase,
        athleteId,
        suggestion,
      );

      if (!isDuplicate) {
        const { error } = await supabase.from("suggestion").insert({
          athlete_id: athleteId,
          ...suggestion,
          pending_surface: true,
        });

        if (!error) {
          insertedCount++;
        } else {
          console.error("Failed to insert suggestion:", error);
        }
      }
    }

    return insertedCount;
  }
}
