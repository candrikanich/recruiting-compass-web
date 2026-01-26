import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const schoolListRule: Rule = {
  id: "school-list-building",
  name: "Build Target School List",
  description: "Athlete should build comprehensive school list (20-30 targets)",
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const gradeLevel = (context.athlete as Record<string, unknown>)
      ?.grade_level || 9;
    const schoolCount = context.schools.length;

    // Only apply to sophomores (10) and juniors (11)
    if (gradeLevel < 10 || gradeLevel > 11) return null;

    // If athlete has fewer than 20 schools
    if (schoolCount < 20) {
      return {
        rule_type: "school-list-building",
        urgency: gradeLevel === 11 ? "high" : "medium",
        message: `You have ${schoolCount} schools on your list. Aim for 20-30 target schools to maximize your opportunities.`,
        action_type: "add_school",
      };
    }

    return null;
  },
};
