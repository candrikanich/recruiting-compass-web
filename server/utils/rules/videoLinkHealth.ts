import type { Rule, RuleContext } from './index'
import type { SuggestionData } from '~/types/timeline'

export const videoLinkHealthRule: Rule = {
  id: 'video-link-health',
  name: 'Broken Video Link',
  description: 'Video URL is not accessible',
  async evaluate(context: RuleContext): Promise<SuggestionData | null> {
    for (const video of context.videos) {
      if (video.health_status === 'broken') {
        return {
          rule_type: 'video-link-health',
          urgency: 'high',
          message: `Your video "${video.title}" link is broken. Update it immediately.`,
          action_type: 'update_video',
        }
      }
    }

    return null
  }
}
