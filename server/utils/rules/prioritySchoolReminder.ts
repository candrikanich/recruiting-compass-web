import type { Rule, RuleContext } from './index'
import type { SuggestionData } from '~/types/timeline'

export const prioritySchoolReminderRule: Rule = {
  id: 'priority-school-reminder',
  name: 'Priority School Check-In',
  description: 'Top priority school needs attention',
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    const priorityASchools = context.schools.filter((s: any) => s.priority === 'A')

    for (const school of priorityASchools) {
      const lastInteraction = context.interactions
        .filter((i: any) => i.school_id === school.id)
        .sort((a: any, b: any) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime())[0]

      const daysSinceContact = lastInteraction
        ? Math.floor((Date.now() - new Date(lastInteraction.interaction_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      if (daysSinceContact >= 14) {
        return {
          rule_type: 'priority-school-reminder',
          urgency: 'high',
          message: `${school.name} is your top priority. Check in with coaches this week.`,
          action_type: 'log_interaction',
          related_school_id: school.id,
        }
      }
    }

    return null
  }
}
