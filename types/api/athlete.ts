/**
 * Athlete API Types
 * Centralized request/response types for athlete-related endpoints
 */

import type { Phase, MilestoneProgress, StatusLabel } from '~/types/timeline'

export namespace AthleteAPI {
  // Phase endpoints
  export interface GetPhaseRequest {}

  export interface GetPhaseResponse {
    phase: Phase
    milestoneProgress: MilestoneProgress
    canAdvance: boolean
  }

  export interface AdvancePhaseRequest {}

  export interface AdvancePhaseResponse {
    success: boolean
    phase: Phase
    message: string
  }

  // Status endpoints
  export interface GetStatusRequest {}

  export interface StatusScoreResult {
    status_label: StatusLabel
    status_score: number
    taskCompletionRate: number
    interactionFrequencyScore: number
    coachInterestScore: number
    academicStandingScore: number
    scoreTrend?: 'up' | 'down' | 'stable'
    trendPercentage?: number
  }

  export interface GetStatusResponse extends StatusScoreResult {}

  export interface RecalculateStatusRequest {}

  export interface RecalculateStatusResponse extends StatusScoreResult {}

  // Portfolio health endpoint
  export interface GetPortfolioHealthRequest {}

  export interface PortfolioHealthScore {
    overall_health_score: number
    school_diversity_score: number
    coach_contact_frequency_score: number
    academic_progress_score: number
    performance_metric_score: number
    communication_score: number
    offer_negotiation_score: number
  }

  export interface GetPortfolioHealthResponse extends PortfolioHealthScore {}
}
