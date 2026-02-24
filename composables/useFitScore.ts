/**
 * useFitScore Composable
 * Manages fit score state and calculations for schools
 */

import { ref, shallowRef, computed } from "vue";
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
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useFitScore");

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
  const schoolFitScoresRef = shallowRef<Map<string, FitScoreResult>>(new Map());
  const portfolioHealthRef = ref<PortfolioHealth | null>(null);
  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

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
    loadingRef.value = true;
    errorRef.value = null;

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

      // Cache the result — replace the Map reference so shallowRef triggers reactivity
      const newMap = new Map(schoolFitScoresRef.value);
      newMap.set(schoolId, fitScore);
      schoolFitScoresRef.value = newMap;

      return fitScore;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to calculate fit score";
      errorRef.value = message;
      logger.error("Fit score calculation error:", err);
      throw err;
    } finally {
      loadingRef.value = false;
    }
  }

  /**
   * Calculate fit scores for all schools
   */
  async function recalculateAllFitScores(
    schools: School[],
  ): Promise<Map<string, FitScoreResult>> {
    loadingRef.value = true;
    errorRef.value = null;

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

      schoolFitScoresRef.value = allScores;
      return allScores;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to recalculate fit scores";
      errorRef.value = message;
      logger.error("Fit score recalculation error:", err);
      throw err;
    } finally {
      loadingRef.value = false;
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
        const cached = schoolFitScoresRef.value.get(school.id);
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
      portfolioHealthRef.value = health;
      return health;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to calculate portfolio health";
      errorRef.value = message;
      logger.error("Portfolio health error:", err);
      throw err;
    }
  }

  /**
   * Get cached fit score for a school
   */
  function getFitScore(schoolId: string): FitScoreResult | undefined {
    return schoolFitScoresRef.value.get(schoolId);
  }

  /**
   * Batch recalculate fit scores via server endpoint
   * Triggered when athlete profile changes (consolidated from useFitScoreRecalculation)
   * @returns Recalculation result with counts of updated and failed scores
   */
  async function _recalculateAllFitScoresViaServer(): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    message: string;
  }> {
    loadingRef.value = true;
    errorRef.value = null;

    try {
      const res = await fetch("/api/athlete/fit-scores/recalculate-all", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Failed to recalculate fit scores: ${res.status}`);
      }

      const response = (await res.json()) as {
        success: boolean;
        updated: number;
        failed: number;
        message: string;
      };

      if (!response?.success) {
        throw new Error(response?.message || "Recalculation failed");
      }

      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to recalculate fit scores";
      errorRef.value = message;
      logger.error("Server fit score recalculation error:", err);
      throw err;
    } finally {
      loadingRef.value = false;
    }
  }

  /**
   * Clear all cached fit scores
   */
  function clearCache(): void {
    schoolFitScoresRef.value = new Map();
    portfolioHealthRef.value = null;
  }

  // Computed properties
  const schoolFitScores = computed(() => schoolFitScoresRef.value);
  const portfolioHealth = computed(() => portfolioHealthRef.value);
  const loading = computed(() => loadingRef.value);
  const error = computed(() => errorRef.value);

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
