import type { Rule, RuleContext } from './rules/index'
import { isDuplicateSuggestion } from './rules/index'
import type { SuggestionData } from '~/types/timeline'

export class RuleEngine {
  private rules: Rule[] = []

  constructor(rules: Rule[] = []) {
    this.rules = rules
  }

  addRule(rule: Rule): void {
    this.rules.push(rule)
  }

  async evaluateAll(context: RuleContext): Promise<SuggestionData[]> {
    const suggestions: SuggestionData[] = []

    for (const rule of this.rules) {
      try {
        const result = await rule.evaluate(context)
        if (result) {
          suggestions.push(result)
        }
      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error)
      }
    }

    return suggestions
  }

  async generateSuggestions(
    supabase: any,
    athleteId: string,
    context: RuleContext
  ): Promise<number> {
    const suggestions = await this.evaluateAll(context)
    let insertedCount = 0

    for (const suggestion of suggestions) {
      const isDuplicate = await isDuplicateSuggestion(
        supabase,
        athleteId,
        suggestion
      )

      if (!isDuplicate) {
        const { error } = await supabase.from('suggestion').insert({
          athlete_id: athleteId,
          ...suggestion,
          pending_surface: true,
        })

        if (!error) {
          insertedCount++
        } else {
          console.error('Failed to insert suggestion:', error)
        }
      }
    }

    return insertedCount
  }
}
