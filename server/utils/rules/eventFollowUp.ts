import type { Rule, RuleContext } from './index'
import type { SuggestionData } from '~/types/timeline'

export const eventFollowUpRule: Rule = {
  id: 'event-follow-up',
  name: 'Event Follow-Up Needed',
  description: 'Attended event but no follow-up interaction logged',
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const recentEvents = context.events.filter((e: any) => {
      const eventDate = new Date(e.event_date)
      const daysSince = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
      return e.attended && daysSince <= 7
    })

    for (const event of recentEvents) {
      const hasFollowUp = context.interactions.some((i: any) => {
        const interactionDate = new Date(i.interaction_date)
        const eventDate = new Date(event.event_date)
        return i.related_event_id === event.id || interactionDate > eventDate
      })

      if (!hasFollowUp) {
        return {
          rule_type: 'event-follow-up',
          urgency: 'medium',
          message: `Follow up on ${event.name} with a thank-you email to coaches you met`,
          action_type: 'log_interaction',
          related_school_id: event.school_id,
        }
      }
    }

    return null
  }
}
