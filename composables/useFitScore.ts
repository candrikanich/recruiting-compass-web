/**
 * useFitScore Composable
 * Manages fit score state and calculations for schools
 */

import { ref, computed } from "vue";
import type { School } from "~/types/models";
import type {
  FitScoreResult,
  PortfolioHealth,
  FitTier,
  FitScoreInputs,
} from "~/types/timeline";
import {
  calculateFitScore,
  calculatePortfolioHealth as calculatePortfolioHealthUtil,
  calculateAthleticFit,
  calculateAcademicFit,
  calculateOpportunityFit,
  calculatePersonalFit,
} from "~/utils/fitScoreCalculation";

interface UseFitScoreState {
  schoolFitScores: Map<string, FitScoreResult>;
  portfolioHealth: PortfolioHealth | null;
  loading: boolean;
  error: string | null;
}

export const useFitScore = (): {
  schoolFitScores: ComputedRef<Map<string, FitScoreResult>>;
  portfolioHealth: ComputedRef<PortfolioHealth | null>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  calculateSchoolFitScore: (
    schoolId: string,
    athleteData?: {
      position?: string;
      height?: number;
      weight?: number;
      velo?: number;
      gpa?: number;
      sat?: number;
      act?: number;
      state?: string;
      campusSizePreference?: "small" | "medium" | "large";
      costSensitivity?: "high" | "medium" | "low";
      targetMajor?: string;
    },
    schoolData?: {
      positionNeeds?: string[];
      coachInterest?: "low" | "medium" | "high";
      campusSize?: number;
      avgGpa?: number;
      avgSat?: number;
      avgAct?: number;
      offeredMajors?: string[];
      rosterDepth?: number;
      yearsToGraduate?: number;
      scholarshipAvailability?: "high" | "medium" | "low";
      state?: string;
      costOfAttendance?: number;
      walkOnHistory?: boolean;
      majorStrengthRating?: number;
    },
  ) => Promise<FitScoreResult>;
  recalculateAllFitScores: (
    schools: School[],
  ) => Promise<Map<string, FitScoreResult>>;
  getPortfolioHealth: (schools: School[]) => Promise<PortfolioHealth>;
  getFitScore: (schoolId: string) => FitScoreResult | undefined;
  clearCache: () => void;
} => {
  const state = ref<UseFitScoreState>({
    schoolFitScores: new Map(),
    portfolioHealth: null,
    loading: false,
    error: null,
  });

  /**
   * Calculate fit score for a single school
   */
  async function calculateSchoolFitScore(
    schoolId: string,
    athleteData?: {
      position?: string;
      height?: number;
      weight?: number;
      velo?: number;
      gpa?: number;
      sat?: number;
      act?: number;
      state?: string;
      campusSizePreference?: "small" | "medium" | "large";
      costSensitivity?: "high" | "medium" | "low";
      targetMajor?: string;
    },
    schoolData?: {
      positionNeeds?: string[];
      coachInterest?: "low" | "medium" | "high";
      campusSize?: number;
      avgGpa?: number;
      avgSat?: number;
      avgAct?: number;
      offeredMajors?: string[];
      rosterDepth?: number;
      yearsToGraduate?: number;
      scholarshipAvailability?: "high" | "medium" | "low";
      state?: string;
      costOfAttendance?: number;
      walkOnHistory?: boolean;
      majorStrengthRating?: number;
    },
  ): Promise<FitScoreResult> {
    state.value.loading = true;
    state.value.error = null;

    try {
      // Calculate each dimension
      const athleticFit = athleteData
        ? calculateAthleticFit(
            athleteData.position || null,
            athleteData.height || null,
            athleteData.weight || null,
            athleteData.velo || null,
            schoolData?.positionNeeds || [],
            schoolData?.coachInterest || "low",
            schoolData?.rosterDepth || 50,
          )
        : 0;

      const academicFit = athleteData
        ? calculateAcademicFit(
            athleteData.gpa || null,
            athleteData.sat || null,
            athleteData.act || null,
            schoolData?.avgGpa || null,
            schoolData?.avgSat || null,
            schoolData?.avgAct || null,
            athleteData.targetMajor || null,
            schoolData?.offeredMajors || [],
          )
        : 0;

      const opportunityFit = schoolData
        ? calculateOpportunityFit(
            schoolData.rosterDepth || 50,
            schoolData.yearsToGraduate || 3,
            schoolData.scholarshipAvailability || "medium",
            schoolData.walkOnHistory || false,
          )
        : 0;

      const personalFit =
        athleteData || schoolData
          ? calculatePersonalFit(
              athleteData?.state || null,
              schoolData?.state || null,
              athleteData?.campusSizePreference || "medium",
              schoolData?.campusSize || 10000,
              athleteData?.costSensitivity || "medium",
              schoolData?.costOfAttendance || 30000,
              false, // isPrioritySchool - would need to check separately
              schoolData?.majorStrengthRating || 5,
            )
          : 0;

      const fitScore = calculateFitScore({
        athleticFit,
        academicFit,
        opportunityFit,
        personalFit,
      });

      // Cache the result
      state.value.schoolFitScores.set(schoolId, fitScore);

      return fitScore;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to calculate fit score";
      state.value.error = message;
      console.error("Fit score calculation error:", err);
      throw err;
    } finally {
      state.value.loading = false;
    }
  }

  /**
   * Calculate fit scores for all schools
   */
  async function recalculateAllFitScores(
    schools: School[],
  ): Promise<Map<string, FitScoreResult>> {
    state.value.loading = true;
    state.value.error = null;

    try {
      const allScores = new Map<string, FitScoreResult>();

      for (const school of schools) {
        // Use existing fit_score if available and valid
        if (
          "fit_score" in school &&
          school.fit_score !== null &&
          school.fit_score !== undefined
        ) {
          const fitData =
            "fit_score_data" in school ? school.fit_score_data : null;
          const fitScoreData =
            fitData && typeof fitData === "object" && "athleticFit" in fitData
              ? (fitData as Partial<FitScoreInputs>)
              : {
                  athleticFit: 0,
                  academicFit: 0,
                  opportunityFit: 0,
                  personalFit: 0,
                };
          const fitScore = calculateFitScore(fitScoreData);
          allScores.set(school.id, fitScore);
        } else {
          // Calculate fresh
          const fitScore = await calculateSchoolFitScore(school.id);
          allScores.set(school.id, fitScore);
        }
      }

      state.value.schoolFitScores = allScores;
      return allScores;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to recalculate fit scores";
      state.value.error = message;
      console.error("Fit score recalculation error:", err);
      throw err;
    } finally {
      state.value.loading = false;
    }
  }

  /**
   * Get portfolio health analysis
   */
  async function getPortfolioHealth(
    schools: School[],
  ): Promise<PortfolioHealth> {
    try {
      // Ensure we have fit scores for all schools
      const schoolsWithFitScores = schools.map((school) => {
        const cached = state.value.schoolFitScores.get(school.id);
        const fitScore =
          cached?.score ||
          ("fit_score" in school && typeof school.fit_score === "number"
            ? school.fit_score
            : 0);
        const fitTier =
          cached?.tier ||
          ("fit_tier" in school && typeof school.fit_tier === "string"
            ? (school.fit_tier as FitTier)
            : undefined);
        return {
          ...school,
          fit_score: fitScore,
          fit_tier: fitTier,
        };
      });

      const health = calculatePortfolioHealthUtil(schoolsWithFitScores);
      state.value.portfolioHealth = health;
      return health;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to calculate portfolio health";
      state.value.error = message;
      console.error("Portfolio health error:", err);
      throw err;
    }
  }

  /**
   * Get cached fit score for a school
   */
  function getFitScore(schoolId: string): FitScoreResult | undefined {
    return state.value.schoolFitScores.get(schoolId);
  }

  /**
   * Clear all cached fit scores
   */
  function clearCache(): void {
    state.value.schoolFitScores.clear();
    state.value.portfolioHealth = null;
  }

  // Computed properties
  const schoolFitScores = computed(() => state.value.schoolFitScores);
  const portfolioHealth = computed(() => state.value.portfolioHealth);
  const loading = computed(() => state.value.loading);
  const error = computed(() => state.value.error);

  return {
    // State
    schoolFitScores,
    portfolioHealth,
    loading,
    error,

    // Methods
    calculateSchoolFitScore,
    recalculateAllFitScores,
    getPortfolioHealth,
    getFitScore,
    clearCache,
  };
};
