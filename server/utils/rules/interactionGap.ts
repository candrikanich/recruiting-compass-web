import type { Rule, RuleContext } from "./index";
import type { SuggestionData, Suggestion } from "~/types/timeline";

function calculateUrgency(daysSinceContact: number): "low" | "medium" | "high" {
  if (daysSinceContact >= 30) return "high";    // 30+ days = RED
  if (daysSinceContact >= 21) return "medium";  // 21-29 days = YELLOW/ORANGE
  return "low";
}

function calculateDaysSinceContact(
  schoolId: string,
  interactions: unknown[]
): number {
  const lastInteraction = (interactions as unknown[])
    .filter((i: unknown) => {
      const interaction = i as Record<string, unknown>;
      return interaction.school_id === schoolId;
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
  return lastInteractionRecord
    ? Math.floor(
        (Date.now() -
          new Date(
            lastInteractionRecord.interaction_date as string,
          ).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 999;
}

export const interactionGapRule: Rule = {
  id: "interaction-gap",
  name: "Interaction Gap Detected",
  description: "Priority school has not been contacted in 21+ days",
  async evaluate(context: RuleContext): Promise<SuggestionData | SuggestionData[] | null> {
    const prioritySchools = context.schools.filter((s: unknown) => {
      const school = s as Record<string, unknown>;
      return (
        ["A", "B"].includes(school.priority as string) &&
        ["interested", "contacted", "visited"].includes(school.status as string)
      );
    });

    const suggestions: SuggestionData[] = [];

    for (const school of prioritySchools) {
      const schoolRecord = school as Record<string, unknown>;
      const daysSinceContact = calculateDaysSinceContact(
        schoolRecord.id as string,
        context.interactions
      );

      if (daysSinceContact >= 21) {
        suggestions.push({
          rule_type: "interaction-gap",
          urgency: calculateUrgency(daysSinceContact),
          message: `It's been ${daysSinceContact} days since you contacted ${schoolRecord.name as string}. Stay on their radar!`,
          action_type: "log_interaction",
          related_school_id: schoolRecord.id as string,
        });
      }
    }

    return suggestions.length > 0 ? suggestions : null;
  },

  createConditionSnapshot(context: RuleContext, relatedSchoolId?: string) {
    if (!relatedSchoolId) {
      return {};
    }

    const school = context.schools.find((s: unknown) => {
      const schoolRecord = s as Record<string, unknown>;
      return schoolRecord.id === relatedSchoolId;
    }) as Record<string, unknown> | undefined;

    const daysSinceContact = calculateDaysSinceContact(
      relatedSchoolId,
      context.interactions
    );

    return {
      days_since_contact: daysSinceContact,
      school_priority: school?.priority ?? school?.priority_tier,
      school_status: school?.status,
    };
  },

  async shouldReEvaluate(
    dismissedSuggestion: Suggestion,
    context: RuleContext
  ): Promise<boolean> {
    if (!dismissedSuggestion.related_school_id || !dismissedSuggestion.condition_snapshot) {
      return false;
    }

    const currentSnapshot = interactionGapRule.createConditionSnapshot?.(
      context,
      dismissedSuggestion.related_school_id
    );

    if (!currentSnapshot) {
      return false;
    }

    const previousSnapshot = dismissedSuggestion.condition_snapshot as Record<
      string,
      unknown
    >;
    const previousDays = previousSnapshot.days_since_contact as number;
    const currentDays = currentSnapshot.days_since_contact as number;

    // Re-evaluate if gap increased by 14+ days
    if (currentDays - previousDays >= 14) {
      return true;
    }

    // Re-evaluate if school priority changed
    if (currentSnapshot.school_priority !== previousSnapshot.school_priority) {
      return true;
    }

    return false;
  },
};
