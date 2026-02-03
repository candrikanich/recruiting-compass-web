/**
 * useStatusScore Composable
 * Manages status score calculation and tracking
 */

import { ref, computed, type ComputedRef, type Ref } from "vue";
import type { StatusLabel, StatusScoreInputs, Phase } from "~/types/timeline";

// import type { GetStatusResponse } from '~/types/api/athlete'
// @ts-nocheck - Module resolution issue in CI
import type { AthleteAPI } from "~/types/api/athlete";
import {
  getStatusColor,
  getStatusAdvice,
  getNextActionsForStatus,
} from "~/utils/statusScoreCalculation";
import { useAuthFetch } from "~/composables/useAuthFetch";

export const useStatusScore = (): {
  statusScore: Ref<number>;
  statusLabel: Ref<StatusLabel>;
  scoreBreakdown: Ref<StatusScoreInputs>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  lastCalculated: Ref<string | null>;
  fetchStatusScore: () => Promise<AthleteAPI.GetStatusResponse>;
  recalculateStatus: () => Promise<AthleteAPI.RecalculateStatusResponse>;
  getNextActions: (phase: Phase) => string[];
  statusColor: ComputedRef<string>;
  advice: ComputedRef<string>;
  scoreDescription: ComputedRef<string>;
  detailedBreakdown: ComputedRef<
    Array<{ label: string; value: number; weight: number; status: string }>
  >;
  weakestAreas: ComputedRef<string[]>;
  strongestAreas: ComputedRef<string[]>;
} => {
  const statusScore = ref<number>(0);
  const statusLabel = ref<StatusLabel>("on_track");
  const scoreBreakdown = ref<StatusScoreInputs>({
    taskCompletionRate: 0,
    interactionFrequencyScore: 0,
    coachInterestScore: 0,
    academicStandingScore: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastCalculated = ref<string | null>(null);

  /**
   * Fetch current status score
   */
  const fetchStatusScore = async (): Promise<AthleteAPI.GetStatusResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const { $fetchAuth } = useAuthFetch();
      const response = (await $fetchAuth("/api/athlete/status")) as {
        score?: number;
        label?: StatusLabel;
        breakdown?: StatusScoreInputs;
      };

      statusScore.value = response?.score ?? 0;
      statusLabel.value = response?.label ?? "on_track";
      scoreBreakdown.value = response?.breakdown ?? {
        taskCompletionRate: 0,
        interactionFrequencyScore: 0,
        coachInterestScore: 0,
        academicStandingScore: 0,
      };
      lastCalculated.value = new Date().toISOString();

      // Convert StatusScoreResult to AthleteAPI.GetStatusResponse format
      return {
        status_score: response?.score ?? 0,
        status_label: response?.label ?? "on_track",
        taskCompletionRate: response?.breakdown?.taskCompletionRate ?? 0,
        interactionFrequencyScore:
          response?.breakdown?.interactionFrequencyScore ?? 0,
        coachInterestScore: response?.breakdown?.coachInterestScore ?? 0,
        academicStandingScore: response?.breakdown?.academicStandingScore ?? 0,
      };
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch status score";
      console.error("Error fetching status score:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Recalculate status score
   */
  const recalculateStatus =
    async (): Promise<AthleteAPI.RecalculateStatusResponse> => {
      loading.value = true;
      error.value = null;

      try {
        const { $fetchAuth } = useAuthFetch();
        const response = (await $fetchAuth("/api/athlete/status/recalculate", {
          method: "POST",
        })) as {
          score?: number;
          label?: StatusLabel;
          breakdown?: StatusScoreInputs;
        };

        statusScore.value = response?.score ?? 0;
        statusLabel.value = response?.label ?? "on_track";
        scoreBreakdown.value = response?.breakdown ?? {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        };
        lastCalculated.value = new Date().toISOString();

        // Convert to AthleteAPI.RecalculateStatusResponse format
        return {
          status_score: response?.score ?? 0,
          status_label: response?.label ?? "on_track",
          taskCompletionRate: response?.breakdown?.taskCompletionRate ?? 0,
          interactionFrequencyScore:
            response?.breakdown?.interactionFrequencyScore ?? 0,
          coachInterestScore: response?.breakdown?.coachInterestScore ?? 0,
          academicStandingScore:
            response?.breakdown?.academicStandingScore ?? 0,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to recalculate status";
        error.value = message;
        console.error("Error recalculating status:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

  /**
   * Get status color
   */
  const statusColor = computed(() => {
    return getStatusColor(statusLabel.value);
  });

  /**
   * Get advice message
   */
  const advice = computed(() => {
    return getStatusAdvice(statusLabel.value);
  });

  /**
   * Get next actions based on current phase
   * Requires usePhaseCalculation to provide phase
   */
  const getNextActions = (phase: Phase) => {
    return getNextActionsForStatus(statusLabel.value, phase);
  };

  /**
   * Get color-coded score description
   */
  const scoreDescription = computed(() => {
    if (statusScore.value >= 75) {
      return "Excellent";
    } else if (statusScore.value >= 60) {
      return "Good";
    } else if (statusScore.value >= 50) {
      return "Fair";
    } else if (statusScore.value >= 40) {
      return "Poor";
    } else {
      return "Critical";
    }
  });

  /**
   * Get detailed breakdown of score
   */
  const detailedBreakdown = computed(() => {
    return [
      {
        label: "Task Completion",
        value: Math.round(scoreBreakdown.value.taskCompletionRate),
        weight: 35,
        status:
          scoreBreakdown.value.taskCompletionRate >= 70 ? "good" : "needs-work",
      },
      {
        label: "Interaction Frequency",
        value: Math.round(scoreBreakdown.value.interactionFrequencyScore),
        weight: 25,
        status:
          scoreBreakdown.value.interactionFrequencyScore >= 70
            ? "good"
            : "needs-work",
      },
      {
        label: "Coach Interest",
        value: Math.round(scoreBreakdown.value.coachInterestScore),
        weight: 25,
        status:
          scoreBreakdown.value.coachInterestScore >= 60 ? "good" : "needs-work",
      },
      {
        label: "Academic Standing",
        value: Math.round(scoreBreakdown.value.academicStandingScore),
        weight: 15,
        status:
          scoreBreakdown.value.academicStandingScore >= 60
            ? "good"
            : "needs-work",
      },
    ];
  });

  /**
   * Identify weakest areas
   */
  const weakestAreas = computed(() => {
    return detailedBreakdown.value
      .filter((item) => item.status === "needs-work")
      .sort((a, b) => a.value - b.value)
      .slice(0, 2)
      .map((item) => item.label);
  });

  /**
   * Identify strongest areas
   */
  const strongestAreas = computed(() => {
    return detailedBreakdown.value
      .filter((item) => item.status === "good")
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((item) => item.label);
  });

  return {
    // State
    statusScore,
    statusLabel,
    scoreBreakdown,
    loading,
    error,
    lastCalculated,

    // Methods
    fetchStatusScore,
    recalculateStatus,
    getNextActions,

    // Computed
    statusColor,
    advice,
    scoreDescription,
    detailedBreakdown,
    weakestAreas,
    strongestAreas,
  };
};
