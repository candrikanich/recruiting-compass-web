import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const officialVisitRule: Rule = {
  id: "official-visit",
  name: "Schedule Official Visits",
  description:
    "Junior and senior athletes should schedule official visits to top schools",
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const gradeLevel =
      (context.athlete as Record<string, unknown>)?.grade_level || 9;

    // Only apply to juniors (11) and seniors (12)
    if (gradeLevel < 11) return null;

    // Check if athlete has any priority A or B schools
    const prioritySchools = context.schools.filter((s: unknown) => {
      const school = s as Record<string, unknown>;
      return ["A", "B"].includes(school.priority as string);
    });

    if (prioritySchools.length === 0) return null;

    // Count interactions that mention "official visit" or are formal visit-type interactions
    const officialVisits = context.interactions.filter((i: unknown) => {
      const interaction = i as Record<string, unknown>;
      const interactionType = (interaction.interaction_type as string) || "";
      return (
        interactionType.toLowerCase().includes("official") ||
        interactionType.toLowerCase().includes("visit")
      );
    });

    // If fewer than 2 official visits logged
    if (officialVisits.length < 2) {
      return {
        rule_type: "official-visit",
        urgency: gradeLevel === 12 ? "high" : "medium",
        message:
          "Schedule official visits to your top 3-5 priority schools to strengthen your relationships with coaches.",
        action_type: "log_interaction",
      };
    }

    return null;
  },
};
