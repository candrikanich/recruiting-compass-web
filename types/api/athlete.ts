/**
 * Athlete API Types
 * Centralized request/response types for athlete-related endpoints
 */

import type { Phase, MilestoneProgress, StatusLabel } from "~/types/timeline";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AthleteAPI {
  // Phase endpoints

  export type GetPhaseRequest = Record<string, never>;

  export interface GetPhaseResponse {
    phase: Phase;
    milestoneProgress: MilestoneProgress;
    canAdvance: boolean;
  }

  export type AdvancePhaseRequest = Record<string, never>;

  export interface AdvancePhaseResponse {
    success: boolean;
    phase: Phase;
    message: string;
  }

  // Status endpoints
  export type GetStatusRequest = Record<string, never>;

  export interface StatusScoreResult {
    status_label: StatusLabel;
    status_score: number;
    taskCompletionRate: number;
    interactionFrequencyScore: number;
    coachInterestScore: number;
    academicStandingScore: number;
    scoreTrend?: "up" | "down" | "stable";
    trendPercentage?: number;
  }

  export type GetStatusResponse = StatusScoreResult;

  export type RecalculateStatusRequest = Record<string, never>;

  export type RecalculateStatusResponse = StatusScoreResult;
}
