/**
 * Timeline Context Messages
 * Generates context-specific messages for StatusSnippet component
 */

import type { Phase } from '~/types/timeline'

export type TimelineContext = 'schools' | 'coaches' | 'interactions' | 'events'

export interface ContextMessageData {
  phase: Phase
  schoolCount?: number
  needsMoreSafeties?: boolean
  coachesToContact?: number
  staleCoaches?: number
  activeCoaches?: number
  eventType?: string
  pendingFollowUps?: number
  recentInteractions?: number
  upcomingEvents?: number
  needsRSVP?: number
  highValueEvents?: number
  finalEvents?: number
}

/**
 * Get context-specific message for timeline snippet
 */
export function getContextMessage(context: TimelineContext, data: ContextMessageData): string {
  const messages = getContextMessages(context)
  return messages[data.phase]?.(data) || 'Check your recruiting timeline'
}

/**
 * Get message generator functions for each context
 */
function getContextMessages(
  context: TimelineContext
): Record<Phase, (data: ContextMessageData) => string> {
  switch (context) {
    case 'schools':
      return {
        freshman: (data) => {
          const needed = 20 - (data.schoolCount || 0)
          return needed > 0
            ? `Research ${needed} more programs to hit your target list`
            : 'You have a solid initial school list'
        },
        sophomore: () => 'Build a target list of 20-25 schools across all fit tiers',
        junior: (data) =>
          data.needsMoreSafeties ? 'Add 2-3 safety schools to ensure your options' : 'Your portfolio looks balanced',
        senior: (data) => `Focus outreach on your top ${data.schoolCount || 5} schools with strongest interest`,
        committed: () => 'Process complete — congratulations on your commitment!'
      }

    case 'coaches':
      return {
        freshman: () => 'Focus on skill development — direct coach contact comes later',
        sophomore: (data) => `${data.coachesToContact || 3} coaches are ready for initial contact`,
        junior: (data) => `${data.staleCoaches || 2} coaches need follow-up this week`,
        senior: (data) => `Stay in touch with ${data.activeCoaches || 3} coaches with strong interest`,
        committed: () => 'Maintain regular contact with your future coaching staff'
      }

    case 'interactions':
      return {
        freshman: () => 'Track your showcase and camp attendance',
        sophomore: (data) => `Log your recent ${data.eventType || 'event'} attendance`,
        junior: (data) => `${data.pendingFollowUps || 2} interactions need follow-up`,
        senior: (data) => `${data.recentInteractions || 3} interactions this month — keep it up!`,
        committed: () => 'Continue building relationships with your future team'
      }

    case 'events':
      return {
        freshman: (data) => `${data.upcomingEvents || 2} showcases coming up this semester`,
        sophomore: (data) => `${data.needsRSVP || 3} events need RSVP confirmation`,
        junior: (data) => `Prioritize these ${data.highValueEvents || 3} high-value events`,
        senior: (data) => `${data.finalEvents || 2} commitment events scheduled`,
        committed: () => 'Focus on team preparation events'
      }

    default:
      return {
        freshman: () => 'Check your recruiting timeline',
        sophomore: () => 'Check your recruiting timeline',
        junior: () => 'Check your recruiting timeline',
        senior: () => 'Check your recruiting timeline',
        committed: () => 'Check your recruiting timeline'
      }
  }
}

/**
 * Get action text for timeline snippet link
 */
export function getContextAction(context: TimelineContext): string {
  const actions: Record<TimelineContext, string> = {
    schools: 'View timeline',
    coaches: 'View timeline',
    interactions: 'View timeline',
    events: 'View timeline'
  }
  return actions[context]
}

/**
 * Get context color for snippet styling
 */
export function getContextColor(context: TimelineContext): string {
  const colors: Record<TimelineContext, string> = {
    schools: 'from-blue-50 to-slate-50',
    coaches: 'from-purple-50 to-slate-50',
    interactions: 'from-emerald-50 to-slate-50',
    events: 'from-orange-50 to-slate-50'
  }
  return colors[context]
}
