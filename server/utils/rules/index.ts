import type { Suggestion, SuggestionData } from '~/types/timeline'

export interface RuleContext {
  athleteId: string
  athlete: any
  schools: any[]
  interactions: any[]
  tasks: any[]
  athleteTasks: any[]
  videos: any[]
  events: any[]
}

export interface Rule {
  id: string
  name: string
  description: string
  evaluate: (context: RuleContext) => Promise<SuggestionData | null>
}

export async function isDuplicateSuggestion(
  supabase: any,
  athleteId: string,
  suggestion: SuggestionData,
  daysWindow: number = 7
): Promise<boolean> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow)

  const { data, error } = await supabase
    .from('suggestion')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('rule_type', suggestion.rule_type)
    .gte('created_at', cutoffDate.toISOString())
    .limit(1)

  return !error && data && data.length > 0
}
