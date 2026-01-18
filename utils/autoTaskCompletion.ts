/**
 * Auto-Task Completion Utility
 * Maps user actions to tasks that should be automatically marked complete
 */

import type { TaskTriggerMapping } from '~/types/timeline'

/**
 * Mapping of trigger actions to task IDs that should be auto-completed
 * This is populated from the seeded task data - these are placeholder IDs
 * In production, these should be fetched from the database based on task titles
 */
export const taskTriggers: TaskTriggerMapping = {
  // When a school is added
  school_added: [
    // 'Build Target School List' tasks for relevant grades
  ],

  // When a highlight video is uploaded
  video_uploaded: [
    // 'Create Highlight Video' tasks
  ],

  // When an interaction is logged
  interaction_logged: [
    // 'Send First Introductory Emails' (sophomore)
    // 'Increase Coach Communication Cadence' (junior)
  ],

  // When an unofficial visit is scheduled
  visit_scheduled: [
    // 'Schedule Unofficial Visits' (junior)
  ],

  // When athlete registers with NCAA
  eligibility_registered: [
    // 'Register with NCAA Eligibility Center' (junior)
  ],

  // When athlete registers with NAIA
  eligibility_naia_registered: [
    // 'Register with NAIA Eligibility Center' (junior)
  ],

  // When SAT/ACT test score is recorded
  test_score_recorded: [
    // 'Take Official SAT or ACT' (junior)
  ],

  // When an event is marked as attended
  event_attended: [
    // 'Attend Summer Camps' (sophomore/junior/senior)
    // 'Play in National Showcases' (junior)
  ],

  // When a camp attendance is recorded
  camp_attended: [
    // 'Attend Recruiting Camps at Target Schools' (junior)
  ],

  // When a coach contact is made
  coach_contact_made: [
    // 'Send First Introductory Emails' (sophomore)
  ],

  // When a profile is marked complete
  profile_completed: [
    // Various freshman tasks
  ],

  // When athletic metrics are recorded
  athletic_metrics_recorded: [
    // 'Get Athletic Testing Baseline' (freshman)
    // 'Get Updated Athletic Testing' (sophomore/junior/senior)
  ],

  // When GPA is recorded/updated
  gpa_recorded: [
    // 'Track GPA and Grades' (freshman)
  ],

  // When an offer is received
  offer_received: [
    // 'Manage Multiple Offers' (senior)
  ],

  // When NLI is signed
  nli_signed: [
    // 'Sign NLI' (senior)
  ],
}

/**
 * Check and auto-complete tasks based on a trigger action
 * @param triggerAction - The action that was performed
 * @param athleteId - The athlete ID
 * @returns Array of task IDs that were auto-completed
 */
export async function checkAndCompleteTask(
  triggerAction: string,
  athleteId: string
): Promise<string[]> {
  const taskIds = taskTriggers[triggerAction] || []

  if (taskIds.length === 0) {
    return []
  }

  try {
    const completedIds = await Promise.all(
      taskIds.map(async (taskId) => {
        try {
          // Check if task already completed
          const existingResponse = await $fetch('/api/athlete-tasks', {
            method: 'GET',
          })

          // This would need actual implementation checking existing task status
          // For now, we'll attempt to mark it complete

          // Mark task as completed
          await $fetch(`/api/athlete-tasks/${taskId}`, {
            method: 'PATCH',
            body: { status: 'completed' },
          })

          return taskId
        } catch (err) {
          console.error(`Failed to auto-complete task ${taskId}:`, err)
          return null
        }
      })
    )

    return completedIds.filter((id): id is string => id !== null)
  } catch (err) {
    console.error('Error in checkAndCompleteTask:', err)
    return []
  }
}

/**
 * Get the trigger action from a specific event type
 * Useful for calling checkAndCompleteTask from various app locations
 */
export function getTriggerAction(eventType: string): string | null {
  const eventTriggerMap: Record<string, string> = {
    'school.added': 'school_added',
    'video.uploaded': 'video_uploaded',
    'interaction.logged': 'interaction_logged',
    'visit.scheduled': 'visit_scheduled',
    'eligibility.registered_ncaa': 'eligibility_registered',
    'eligibility.registered_naia': 'eligibility_naia_registered',
    'test.score_recorded': 'test_score_recorded',
    'event.attended': 'event_attended',
    'camp.attended': 'camp_attended',
    'coach.contacted': 'coach_contact_made',
    'profile.completed': 'profile_completed',
    'metrics.recorded': 'athletic_metrics_recorded',
    'gpa.recorded': 'gpa_recorded',
    'offer.received': 'offer_received',
    'nli.signed': 'nli_signed',
  }

  return eventTriggerMap[eventType] || null
}

/**
 * Emit auto-completion check
 * Call this from anywhere in the app when an action occurs
 */
export function emitAutoCompletion(eventType: string, athleteId?: string) {
  const trigger = getTriggerAction(eventType)
  if (trigger && athleteId) {
    // Trigger auto-completion asynchronously without blocking
    checkAndCompleteTask(trigger, athleteId).catch(err =>
      console.error('Auto-completion check failed:', err)
    )
  }
}
