import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const interactionGapRule: Rule = {
  id: "interaction-gap",
  name: "Interaction Gap Detected",
  description: "Priority school has not been contacted in 21+ days",
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const prioritySchools = context.schools.filter((s: unknown) => {
      const school = s as Record<string, unknown>;
      return (
        ["A", "B"].includes(school.priority as string) &&
        ["interested", "contacted", "visited"].includes(school.status as string)
      );
    });

    for (const school of prioritySchools) {
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

      const lastInteractionRecord = lastInteraction as Record<string, unknown>;
      const daysSinceContact = lastInteractionRecord
        ? Math.floor(
            (Date.now() -
              new Date(
                lastInteractionRecord.interaction_date as string,
              ).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

      if (daysSinceContact >= 21) {
        return {
          rule_type: "interaction-gap",
          urgency: "high",
          message: `It's been ${daysSinceContact} days since you contacted ${schoolRecord.name as string}. Stay on their radar!`,
          action_type: "log_interaction",
          related_school_id: schoolRecord.id as string,
        };
      }
    }

    return null;
  },
};
