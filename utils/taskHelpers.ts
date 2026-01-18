/**
 * Task Helper Utilities
 * Color mapping and formatting functions for tasks
 */

import type { TaskCategory, TaskStatus } from '~/types/timeline'

/**
 * Get TailwindCSS color classes for task category
 */
export function getCategoryColor(category: TaskCategory): string {
  const colors: Record<TaskCategory, string> = {
    academic: 'bg-blue-100 text-blue-700',
    athletic: 'bg-purple-100 text-purple-700',
    recruiting: 'bg-emerald-100 text-emerald-700',
    exposure: 'bg-orange-100 text-orange-700',
    mindset: 'bg-pink-100 text-pink-700'
  }
  return colors[category] || 'bg-slate-100 text-slate-700'
}

/**
 * Get TailwindCSS color classes for task status
 */
export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    skipped: 'bg-slate-100 text-slate-600'
  }
  return colors[status] || 'bg-slate-100 text-slate-700'
}

/**
 * Format category name for display
 */
export function formatCategory(category: TaskCategory): string {
  const formatted: Record<TaskCategory, string> = {
    academic: 'Academic',
    athletic: 'Athletic',
    recruiting: 'Recruiting',
    exposure: 'Exposure',
    mindset: 'Mindset'
  }
  return formatted[category] || category
}

/**
 * Format status name for display
 */
export function formatStatus(status: TaskStatus): string {
  const formatted: Record<TaskStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped'
  }
  return formatted[status] || status
}
