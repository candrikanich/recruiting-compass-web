/**
 * Recovery System Types
 * Defines types for athlete recovery/catch-up system
 */

export type RecoveryTriggerType =
  | 'critical_task_missed'
  | 'no_coach_interest'
  | 'eligibility_incomplete'
  | 'fit_gap'

export interface RecoveryTrigger {
  type: RecoveryTriggerType
  title: string
  description: string
  severity: 'medium' | 'high'
  details: Record<string, any>
}

export interface RecoveryStep {
  order: number
  title: string
  description: string
  taskId?: string // If this step corresponds to a task
}

export interface RecoveryPlan {
  trigger: RecoveryTrigger
  title: string
  description: string
  steps: RecoveryStep[]
  durationDays: number
  tasksToCreate: string[] // Task IDs to mark as recovery tasks
  createdAt: string
}

export interface RecoveryCheckResult {
  inRecoveryMode: boolean
  trigger: RecoveryTrigger | null
  lastShown: string | null
}
