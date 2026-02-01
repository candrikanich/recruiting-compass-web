import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const formalOutreachRule: Rule = {
  id: "formal-outreach",
  name: "Increase Formal Coach Outreach",
  description:
    "Junior+ athletes should maintain monthly touchpoints with coaches",
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const gradeLevel =
      (context.athlete as Record<string, unknown>)?.grade_level || 9;

    // Only apply to juniors (11) and seniors (12)
    if (gradeLevel < 11) return null;

    // Get priority schools (A and B tier)
    const prioritySchools = context.schools.filter((s: unknown) => {
      const school = s as Record<string, unknown>;
      return ["A", "B"].includes(school.priority as string);
    });

    if (prioritySchools.length === 0) return null;

    // Calculate average days since last interaction across priority schools
    const daysSinceInteractionList: number[] = [];

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

      if (lastInteraction) {
        const intRecord = lastInteraction as Record<string, unknown>;
        const daysSince = Math.floor(
          (Date.now() -
            new Date(intRecord.interaction_date as string).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        daysSinceInteractionList.push(daysSince);
      } else {
        daysSinceInteractionList.push(999); // No interaction recorded
      }
    }

    // If average gap is more than 30 days or any priority school hasn't been contacted
    const avgDaysSince =
      daysSinceInteractionList.length > 0
        ? Math.floor(
            daysSinceInteractionList.reduce((a, b) => a + b, 0) /
              daysSinceInteractionList.length,
          )
        : 999;

    if (avgDaysSince > 30 || daysSinceInteractionList.some((d) => d > 45)) {
      return {
        rule_type: "formal-outreach",
        urgency: gradeLevel === 11 ? "medium" : "high",
        message:
          "Increase formal outreach to coaches - aim for monthly touchpoints with your priority schools.",
        action_type: "log_interaction",
      };
    }

    return null;
  },
};
