import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

export const missingVideoRule: Rule = {
  id: "missing-video",
  name: "Missing Highlight Video",
  description: "Athlete is sophomore or beyond without highlight video",
  async evaluate(
    context: RuleContext,
  ): Promise<SuggestionData | SuggestionData[] | null> {
    const gradeLevel =
      ((context.athlete as Record<string, unknown>)?.grade_level as number) ??
      9;
    const hasVideos = context.videos.length > 0;

    if (gradeLevel >= 10 && !hasVideos) {
      return {
        rule_type: "missing-video",
        urgency: "medium",
        message: "Create a highlight video to showcase your skills to coaches",
        action_type: "add_video",
      };
    }

    return null;
  },
};
