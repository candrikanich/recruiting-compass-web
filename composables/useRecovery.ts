import { ref } from 'vue'
import { useSchools } from '~/composables/useSchools'
import { useInteractions } from '~/composables/useInteractions'
import { useTasks } from '~/composables/useTasks'
import type { Interaction, School } from '~/types/models'

export type RecoveryTriggerType = 'critical_task_missed' | 'no_coach_interest' | 'eligibility_incomplete' | 'fit_gap'

export interface RecoveryTrigger {
  type: RecoveryTriggerType
  details: Record<string, any>
  severity: 'high' | 'medium'
}

export interface RecoveryPlan {
  title: string
  description: string
  steps: string[]
  duration_days: number
  tasks_to_create: string[] // Task IDs to mark as recovery
}

export interface RecoveryCheckResult {
  triggered: boolean
  trigger: RecoveryTrigger | null
  plan: RecoveryPlan | null
}

export function useRecovery() {
  const { schools } = useSchools()
  const { interactions } = useInteractions()
  const { athleteTasks } = useTasks()

  const isInRecoveryMode = ref(false)
  const activeRecoveryPlan = ref<RecoveryPlan | null>(null)
  const activeTrigger = ref<RecoveryTrigger | null>(null)
  const triggerHistory = ref<RecoveryTrigger[]>([])

  /**
   * Check for critical task that should have been completed
   * Looks for required Phase 1-2 tasks not completed by junior year
   */
  const checkCriticalTaskMissed = (): RecoveryTrigger | null => {
    // Critical tasks: profile complete, video uploaded, initial school list
    const criticalTaskIds = ['task-9-a1', 'task-10-r1', 'task-10-r3']
    const completedTasks = athleteTasks.value
      .filter((at) => at.status === 'completed')
      .map((at) => at.task_id)

    const missedCritical = criticalTaskIds.filter((id) => !completedTasks.includes(id))

    if (missedCritical.length > 0) {
      return {
        type: 'critical_task_missed',
        details: {
          missingTasks: missedCritical,
          count: missedCritical.length,
        },
        severity: 'high',
      }
    }

    return null
  }

  /**
   * Check if no positive coach interactions in last 30 days
   * Indicates stalled outreach efforts
   */
  const checkNoCoachInterest = (): RecoveryTrigger | null => {
    if (!interactions.value || interactions.value.length === 0) {
      return {
        type: 'no_coach_interest',
        details: {
          lastInteractionDaysAgo: null,
          recentInteractions: 0,
        },
        severity: 'high',
      }
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPositive = interactions.value.filter((int) => {
      const intDate = new Date(int.occurred_at || int.created_at || '')
      return (
        intDate > thirtyDaysAgo &&
        ['very_positive', 'positive'].includes(int.sentiment || '')
      )
    })

    if (recentPositive.length === 0) {
      const lastInteraction = interactions.value.sort(
        (a, b) =>
          new Date(b.occurred_at || b.created_at || '').getTime() -
          new Date(a.occurred_at || a.created_at || '').getTime()
      )[0]

      const lastIntDate = new Date(lastInteraction.occurred_at || lastInteraction.created_at || '')
      const daysAgo = Math.floor((Date.now() - lastIntDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        type: 'no_coach_interest',
        details: {
          lastInteractionDaysAgo: daysAgo,
          recentInteractions: 0,
        },
        severity: 'high',
      }
    }

    return null
  }

  /**
   * Check if NCAA eligibility not started
   * Critical for D1/D2 athletes
   */
  const checkEligibilityIncomplete = async (): Promise<RecoveryTrigger | null> => {
    try {
      // This would check the user's profile for eligibility_status
      // In a real implementation, this would be: if (user.eligibility_status === 'not_started')
      // For now, we simulate by checking if the task was never started

      const eligibilityTask = athleteTasks.value.find((at) => at.task_id === 'task-11-a1')

      if (!eligibilityTask || eligibilityTask.status === 'not_started') {
        return {
          type: 'eligibility_incomplete',
          details: {
            registrationStatus: 'not_started',
            daysUntilEarlyDecember: calculateDaysUntilDeadline(),
          },
          severity: 'high',
        }
      }
    } catch (err) {
      console.error('Error checking eligibility:', err)
    }

    return null
  }

  /**
   * Check if portfolio lacks reach/match/safety balance
   * All schools should not be same tier
   */
  const checkFitGap = (): RecoveryTrigger | null => {
    if (!schools.value || schools.value.length < 3) {
      return {
        type: 'fit_gap',
        details: {
          schoolCount: schools.value?.length || 0,
          matchSafetyCount: 0,
          recommendation: 'Build a balanced college list with reach, match, and safety schools',
        },
        severity: 'high',
      }
    }

    // Count schools by fit tier (would need fit_tier field populated)
    // Simplified: if all schools have same status, it's a gap
    const statuses = schools.value.map((s) => s.status)
    const uniqueStatuses = new Set(statuses)

    if (uniqueStatuses.size === 1) {
      return {
        type: 'fit_gap',
        details: {
          schoolCount: schools.value.length,
          allSameStatus: statuses[0],
          matchSafetyCount: 0,
        },
        severity: 'medium',
      }
    }

    return null
  }

  /**
   * Generate recovery plan based on trigger type
   */
  const generateRecoveryPlan = (trigger: RecoveryTrigger): RecoveryPlan => {
    const plans: Record<RecoveryTriggerType, RecoveryPlan> = {
      critical_task_missed: {
        title: 'Complete Critical Foundation Tasks',
        description:
          'You\'re missing essential recruiting foundation tasks. This plan will get you caught up in 2-3 weeks.',
        steps: [
          'Complete your athlete profile with height, weight, position, and stats',
          'Create and upload your highlight video (3-5 min compilation)',
          'Build initial college list with 10-15 schools you\'re interested in',
          'Start reaching out to coaches at target schools',
        ],
        duration_days: 21,
        tasks_to_create: ['task-9-a1', 'task-10-r1', 'task-10-r3'],
      },

      no_coach_interest: {
        title: 'Rebuild Coach Outreach',
        description:
          'It\'s been quiet from coaches lately. Let\'s restart outreach with a fresh strategy.',
        steps: [
          'Review your highlight video and update it if needed',
          'Create personalized emails for 10 coaches at your target schools',
          'Send emails with specific details about why you fit each program',
          'Follow up 2 weeks later if no response',
          'Attend showcases/camps in next month',
        ],
        duration_days: 45,
        tasks_to_create: ['task-10-r1', 'task-10-r5', 'task-11-r3'],
      },

      eligibility_incomplete: {
        title: 'Register NCAA Eligibility',
        description:
          'NCAA eligibility registration is critical for D1/D2 recruitment. Complete this immediately.',
        steps: [
          'Visit NCAA Eligibility Center website',
          'Create account with full athlete information',
          'Submit test scores (SAT/ACT)',
          'Submit transcript and GPA information',
          'Wait for confirmation (typically 2-3 weeks)',
        ],
        duration_days: 30,
        tasks_to_create: ['task-11-a1'],
      },

      fit_gap: {
        title: 'Build Balanced College List',
        description:
          'Diversify your college list to include reach, match, and safety schools.',
        steps: [
          'Add 3-5 "reach" schools (strong D1 programs, slightly above your stats)',
          'Add 5-7 "match" schools (programs that fit your profile well)',
          'Add 2-3 "safety" schools (D2/D3/NAIA where you\'re competitive)',
          'Research coaches at each school and add contact info',
          'Schedule campus visits to top 5 choices',
        ],
        duration_days: 14,
        tasks_to_create: ['task-10-r3', 'task-10-r5'],
      },
    }

    return plans[trigger.type]
  }

  /**
   * Check all recovery triggers
   */
  const checkRecoveryTriggers = async (): Promise<RecoveryCheckResult> => {
    // Check in order of severity
    let trigger: RecoveryTrigger | null = null

    // 1. Critical task missed (highest priority)
    trigger = checkCriticalTaskMissed()
    if (trigger) {
      const plan = generateRecoveryPlan(trigger)
      return { triggered: true, trigger, plan }
    }

    // 2. Eligibility incomplete
    trigger = await checkEligibilityIncomplete()
    if (trigger) {
      const plan = generateRecoveryPlan(trigger)
      return { triggered: true, trigger, plan }
    }

    // 3. No coach interest
    trigger = checkNoCoachInterest()
    if (trigger) {
      const plan = generateRecoveryPlan(trigger)
      return { triggered: true, trigger, plan }
    }

    // 4. Fit gap (lowest severity)
    trigger = checkFitGap()
    if (trigger) {
      const plan = generateRecoveryPlan(trigger)
      return { triggered: true, trigger, plan }
    }

    return { triggered: false, trigger: null, plan: null }
  }

  /**
   * Activate recovery mode and display plan
   */
  const activateRecoveryMode = async () => {
    const result = await checkRecoveryTriggers()

    if (result.triggered && result.trigger && result.plan) {
      isInRecoveryMode.value = true
      activeTrigger.value = result.trigger
      activeRecoveryPlan.value = result.plan
    }

    return result
  }

  /**
   * Acknowledge recovery plan (mark as seen)
   */
  const acknowledgeRecoveryPlan = async () => {
    // In a real app, this would save to DB
    // For now, just track locally
    isInRecoveryMode.value = false

    // Could trigger: POST /api/recovery/acknowledge
    // To record when the user saw the recovery plan
  }

  /**
   * Helper: Calculate days until NCAA deadline (early December)
   */
  const calculateDaysUntilDeadline = (): number => {
    const now = new Date()
    const thisYearDeadline = new Date(now.getFullYear(), 11, 1) // Dec 1
    const nextYearDeadline = new Date(now.getFullYear() + 1, 11, 1)

    const deadline = now < thisYearDeadline ? thisYearDeadline : nextYearDeadline
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return daysUntil
  }

  return {
    // State
    isInRecoveryMode,
    activeRecoveryPlan,
    activeTrigger,
    triggerHistory,

    // Methods
    checkRecoveryTriggers,
    activateRecoveryMode,
    acknowledgeRecoveryPlan,
    generateRecoveryPlan,

    // Individual trigger checks
    checkCriticalTaskMissed,
    checkNoCoachInterest,
    checkEligibilityIncomplete,
    checkFitGap,
  }
}
