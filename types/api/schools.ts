/**
 * Schools API Types
 * Centralized request/response types for school-related endpoints
 */

/* eslint-disable @typescript-eslint/no-empty-object-type */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SchoolsAPI {
  // Fit score endpoint
  export interface GetFitScoreRequest {
    // Empty interface - fit score calculated from athlete profile
  }

  export interface FitScoreData {
    schoolId: string;
    schoolName: string;
    fitScore: number | null;
    fitScoreData: Record<string, unknown> | null;
  }

  export interface GetFitScoreResponse {
    success: boolean;
    data: FitScoreData;
  }

  export interface CalculateFitScoreRequest {
    // Empty interface - trigger-based calculation
  }

  export interface CalculateFitScoreResponse {
    success: boolean;
    data: FitScoreData;
  }
}
