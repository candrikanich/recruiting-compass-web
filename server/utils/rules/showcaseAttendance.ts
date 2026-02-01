import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

function getLastEventDate(events: unknown[]): Date | null {
  if (!events || events.length === 0) return null;

  const eventDates = events
    .map((e: unknown) => {
      const event = e as Record<string, unknown>;
      const date = event.event_date as string;
      return date ? new Date(date) : null;
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  return eventDates.length > 0 ? eventDates[0] : null;
}

export const showcaseAttendanceRule: Rule = {
  id: "showcase-attendance",
  name: "Attend Summer Showcases",
  description: "Sophomore athletes should attend showcases for exposure",
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const gradeLevel =
      (context.athlete as Record<string, unknown>)?.grade_level || 9;

    // Only apply to sophomores (10)
    if (gradeLevel !== 10) return null;

    const lastEventDate = getLastEventDate(context.events);

    // If no events or last event was more than 6 months ago
    if (!lastEventDate) {
      return {
        rule_type: "showcase-attendance",
        urgency: "medium",
        message:
          "Attend summer showcases to get exposure to college coaches and increase visibility.",
        action_type: "log_interaction",
      };
    }

    const monthsSinceEvent = Math.floor(
      (Date.now() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );

    if (monthsSinceEvent > 6) {
      return {
        rule_type: "showcase-attendance",
        urgency: "medium",
        message:
          "Plan to attend a showcase soon. Regular exposure at events keeps you visible to coaches.",
        action_type: "log_interaction",
      };
    }

    return null;
  },
};
