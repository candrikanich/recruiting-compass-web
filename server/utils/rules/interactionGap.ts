import type { Rule, RuleContext } from './index'
import type { SuggestionData } from '~/types/timeline'

export const interactionGapRule: Rule = {
  id: 'interaction-gap',
  name: 'Interaction Gap Detected',
  description: 'Priority school has not been contacted in 21+ days',
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const prioritySchools = context.schools.filter(
      (s: any) => ['A', 'B'].includes(s.priority) &&
           ['interested', 'contacted', 'visited'].includes(s.status)
    )

    for (const school of prioritySchools) {
      const lastInteraction = context.interactions
        .filter((i: any) => i.school_id === school.id)
        .sort((a: any, b: any) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime())[0]

      const daysSinceContact = lastInteraction
        ? Math.floor((Date.now() - new Date(lastInteraction.interaction_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      if (daysSinceContact >= 21) {
        return {
          rule_type: 'interaction-gap',
          urgency: 'high',
          message: `It's been ${daysSinceContact} days since you contacted ${school.name}. Stay on their radar!`,
          action_type: 'log_interaction',
          related_school_id: school.id,
        }
      }
    }

    return null
  }
}
