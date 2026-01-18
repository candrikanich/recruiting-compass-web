import type { Rule, RuleContext } from './index'
import type { SuggestionData } from '~/types/timeline'

export const portfolioHealthRule: Rule = {
  id: 'portfolio-health',
  name: 'Portfolio Health Issue',
  description: 'All schools are unlikely fits',
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    if (context.schools.length === 0) return null

    const allUnlikely = context.schools.every((s: any) => (s.fit_score || 0) < 50)

    if (allUnlikely) {
      return {
        rule_type: 'portfolio-health',
        urgency: 'high',
        message: 'Your school list has no strong matches. Add schools that align better with your profile.',
        action_type: 'add_school',
      }
    }

    return null
  }
}
