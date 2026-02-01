import type { Rule, RuleContext } from "./index";
import type { SuggestionData } from "~/types/timeline";

interface Event {
  id: string;
  name: string;
  event_date: string;
  school_id?: string;
  attended: boolean;
}

interface Interaction {
  id: string;
  interaction_date: string;
  related_event_id?: string;
}

export const eventFollowUpRule: Rule = {
  id: "event-follow-up",
  name: "Event Follow-Up Needed",
  description: "Attended event but no follow-up interaction logged",
  async evaluate(
    context: RuleContext,
  ): Promise<SuggestionData | SuggestionData[] | null> {
    const recentEvents = context.events.filter((e) => {
      const event = e as Event;
      const eventDate = new Date(event.event_date);
      const daysSince = Math.floor(
        (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return event.attended && daysSince <= 7;
    });

    const suggestions: SuggestionData[] = [];

    for (const eventRecord of recentEvents) {
      const event = eventRecord as Event;
      const hasFollowUp = context.interactions.some((i) => {
        const interaction = i as Interaction;
        const interactionDate = new Date(interaction.interaction_date);
        const eventDate = new Date(event.event_date);
        return (
          interaction.related_event_id === event.id ||
          interactionDate > eventDate
        );
      });

      if (!hasFollowUp) {
        suggestions.push({
          rule_type: "event-follow-up",
          urgency: "medium",
          message: `Follow up on ${event.name} with a thank-you email to coaches you met`,
          action_type: "log_interaction",
          related_school_id: event.school_id,
        });
      }
    }

    return suggestions.length > 0 ? suggestions : null;
  },
};
