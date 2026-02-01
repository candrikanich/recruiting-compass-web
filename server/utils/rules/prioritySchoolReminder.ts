import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const prioritySchoolReminderRule: Rule = {
  id: "priority-school-reminder",
  name: "Priority School Check-In",
  description: "Top priority school needs attention",
  async evaluate(
    context: RuleContext,
  ): Promise<SuggestionData | SuggestionData[] | null> {
    const priorityASchools = context.schools.filter((s: unknown) => {
      const school = s as Record<string, unknown>;
      return school.priority === "A";
    });

    const suggestions: SuggestionData[] = [];

    for (const school of priorityASchools) {
      const schoolRecord = school as Record<string, unknown>;
      const lastInteraction = context.interactions
        .filter((i: unknown) => {
          const interaction = i as Record<string, unknown>;
          return interaction.school_id === schoolRecord.id;
        })
        .sort((a: unknown, b: unknown) => {
          const intA = a as Record<string, unknown>;
          const intB = b as Record<string, unknown>;
          return (
            new Date(intB.interaction_date as string).getTime() -
            new Date(intA.interaction_date as string).getTime()
          );
        })[0];

      const lastInteractionRecord = lastInteraction as
        | Record<string, unknown>
        | undefined;
      const daysSinceContact = lastInteractionRecord
        ? Math.floor(
            (Date.now() -
              new Date(
                lastInteractionRecord.interaction_date as string,
              ).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

      if (daysSinceContact >= 14) {
        suggestions.push({
          rule_type: "priority-school-reminder",
          urgency: "high",
          message: `${schoolRecord.name as string} is your top priority. Check in with coaches this week.`,
          action_type: "log_interaction",
          related_school_id: schoolRecord.id as string,
        });
      }
    }

    return suggestions.length > 0 ? suggestions : null;
  },
};
