import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const ncaaRegistrationRule: Rule = {
  id: "ncaa-registration",
  name: "Register with NCAA Eligibility Center",
  description:
    "Junior athletes pursuing DI/DII must register with NCAA Eligibility Center",
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const gradeLevel = (context.athlete as Record<string, unknown>)
      ?.grade_level || 9;

    // Only apply to juniors (11)
    if (gradeLevel !== 11) return null;

    // Check if athlete has DI or DII schools in their list
    const hasDIDIISchools = context.schools.some((s: unknown) => {
      const school = s as Record<string, unknown>;
      const division = school.division as string;
      return ["DI", "DII"].includes(division);
    });

    if (!hasDIDIISchools) return null;

    // Check if NCAA registration task has been completed
    const ncaaTaskCompleted = context.athleteTasks.some((at: unknown) => {
      const athleteTask = at as Record<string, unknown>;
      return (
        athleteTask.task_id === "task-11-a3" &&
        athleteTask.status === "completed"
      );
    });

    if (!ncaaTaskCompleted) {
      return {
        rule_type: "ncaa-registration",
        urgency: "high",
        message:
          "Register with the NCAA Eligibility Center - required for DI/DII recruiting.",
        action_type: "log_interaction",
      };
    }

    return null;
  },
};
