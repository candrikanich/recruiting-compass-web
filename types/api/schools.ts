/**
 * Schools API Types
 * Centralized request/response types for school-related endpoints
 */

export namespace SchoolsAPI {
  // Fit score endpoint
  export interface GetFitScoreRequest {}

  export interface FitScoreData {
    schoolId: string
    schoolName: string
    fitScore: number | null
    fitScoreData: Record<string, unknown> | null
  }

  export interface GetFitScoreResponse {
    success: boolean
    data: FitScoreData
  }

  export interface CalculateFitScoreRequest {}

  export interface CalculateFitScoreResponse {
    success: boolean
    data: FitScoreData
  }
}
