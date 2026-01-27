import { ref, computed, type ComputedRef, type Ref } from "vue";
import type {
  StatusLabel,
  StatusScoreInputs,
  Phase,
  MilestoneProgress,
} from "~/types/timeline";
import type { AthleteAPI } from "~/types/api/athlete";
import {
  getStatusColor,
  getStatusAdvice,
  getNextActionsForStatus,
} from "~/utils/statusScoreCalculation";
import { getNextPhase, PHASE_INFO } from "~/utils/phaseCalculation";
import { fetchAuth } from "~/utils/authFetch";

/**
 * useRecruitingStatus composable
 * Consolidated from useStatusScore + usePhaseCalculation
 * Manages athlete recruiting status (score, label) and phase progression
 *
 * Features:
 * - Fetch and recalculate recruiting status score
 * - Track phase progression and milestones
 * - Calculate next actions based on status and phase
 * - Compute status color, advice, and breakdowns
 * - Advance to next phase when milestones are met
 */
export const useRecruitingStatus = (): {
  // Status State
  statusScore: Ref<number>;
  statusLabel: Ref<StatusLabel>;
  scoreBreakdown: Ref<StatusScoreInputs>;

  // Phase State
  currentPhase: Ref<Phase>;
  milestoneProgress: Ref<MilestoneProgress | null>;

  // Shared State
  loading: Ref<boolean>;
  error: Ref<string | null>;
  lastCalculated: Ref<string | null>;

  // Status Methods
  fetchStatusScore: () => Promise<AthleteAPI.GetStatusResponse>;
  recalculateStatus: () => Promise<AthleteAPI.RecalculateStatusResponse>;

  // Phase Methods
  fetchPhase: () => Promise<AthleteAPI.GetPhaseResponse>;
  advancePhase: () => Promise<AthleteAPI.AdvancePhaseResponse>;
  refreshPhase: () => Promise<AthleteAPI.GetPhaseResponse>;

  // Action Methods
  getNextActions: () => string[];

  // Status Computed
  statusColor: ComputedRef<string>;
  advice: ComputedRef<string>;
  scoreDescription: ComputedRef<string>;
  detailedBreakdown: ComputedRef<
    Array<{ label: string; value: number; weight: number; status: string }>
  >;
  weakestAreas: ComputedRef<string[]>;
  strongestAreas: ComputedRef<string[]>;

  // Phase Computed
  canAdvance: ComputedRef<boolean>;
  nextPhase: ComputedRef<Phase | null>;
  phaseInfo: ComputedRef<(typeof PHASE_INFO)[Phase]>;
  remainingMilestones: ComputedRef<string[]>;
  completionPercentage: ComputedRef<number>;
  progressLabel: ComputedRef<string>;
} => {
  // ============================================================================
  // STATUS STATE (from useStatusScore)
  // ============================================================================
  const statusScore = ref<number>(0);
  const statusLabel = ref<StatusLabel>("on_track");
  const scoreBreakdown = ref<StatusScoreInputs>({
    taskCompletionRate: 0,
    interactionFrequencyScore: 0,
    coachInterestScore: 0,
    academicStandingScore: 0,
  });

  // ============================================================================
  // PHASE STATE (from usePhaseCalculation)
  // ============================================================================
  const currentPhase = ref<Phase>("freshman");
  const milestoneProgress = ref<MilestoneProgress | null>(null);

  // ============================================================================
  // SHARED STATE
  // ============================================================================
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastCalculated = ref<string | null>(null);

  // ============================================================================
  // STATUS METHODS (from useStatusScore)
  // ============================================================================

  const fetchStatusScore = async (): Promise<AthleteAPI.GetStatusResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchAuth("/api/athlete/status");

      statusScore.value = response?.score ?? 0;
      statusLabel.value = response?.label ?? "on_track";
      scoreBreakdown.value = response?.breakdown ?? {
        taskCompletionRate: 0,
        interactionFrequencyScore: 0,
        coachInterestScore: 0,
        academicStandingScore: 0,
      };
      lastCalculated.value = new Date().toISOString();

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

  const recalculateStatus =
    async (): Promise<AthleteAPI.RecalculateStatusResponse> => {
      loading.value = true;
      error.value = null;

      try {
        const response = (await fetchAuth("/api/athlete/status/recalculate", {
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

  // ============================================================================
  // PHASE METHODS (from usePhaseCalculation)
  // ============================================================================

  const fetchPhase = async (): Promise<AthleteAPI.GetPhaseResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchAuth<AthleteAPI.GetPhaseResponse>(
        "/api/athlete/phase",
      );

      currentPhase.value = response.phase;
      milestoneProgress.value = response.milestoneProgress;

      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch phase";
      console.error("Error fetching phase:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const advancePhase = async (): Promise<AthleteAPI.AdvancePhaseResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchAuth<AthleteAPI.AdvancePhaseResponse>(
        "/api/athlete/phase/advance",
        {
          method: "POST",
        },
      );

      if (response.success) {
        currentPhase.value = response.phase;
        await refreshPhase();
      }

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to advance phase";
      error.value = message;
      console.error("Error advancing phase:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const refreshPhase = async () => {
    return fetchPhase();
  };

  // ============================================================================
  // ACTION METHODS
  // ============================================================================

  const getNextActions = () => {
    return getNextActionsForStatus(statusLabel.value, currentPhase.value);
  };

  // ============================================================================
  // STATUS COMPUTED (from useStatusScore)
  // ============================================================================

  const statusColor = computed(() => {
    return getStatusColor(statusLabel.value);
  });

  const advice = computed(() => {
    return getStatusAdvice(statusLabel.value);
  });

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

  const weakestAreas = computed(() => {
    return detailedBreakdown.value
      .filter((item) => item.status === "needs-work")
      .sort((a, b) => a.value - b.value)
      .slice(0, 2)
      .map((item) => item.label);
  });

  const strongestAreas = computed(() => {
    return detailedBreakdown.value
      .filter((item) => item.status === "good")
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((item) => item.label);
  });

  // ============================================================================
  // PHASE COMPUTED (from usePhaseCalculation)
  // ============================================================================

  const canAdvance = computed((): boolean => {
    if (!milestoneProgress.value) return false;
    return milestoneProgress.value.remaining.length === 0;
  });

  const nextPhase = computed((): Phase | null => {
    return getNextPhase(currentPhase.value);
  });

  const phaseInfo = computed(() => {
    return PHASE_INFO[currentPhase.value];
  });

  const remainingMilestones = computed(() => {
    return milestoneProgress.value?.remaining ?? [];
  });

  const completionPercentage = computed(() => {
    return milestoneProgress.value?.percentComplete ?? 0;
  });

  const progressLabel = computed(() => {
    if (!milestoneProgress.value) return "";
    const completed = milestoneProgress.value.completed.length;
    const total = milestoneProgress.value.required.length;
    return `${completed}/${total} milestones complete`;
  });

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    // Status State
    statusScore,
    statusLabel,
    scoreBreakdown,

    // Phase State
    currentPhase,
    milestoneProgress,

    // Shared State
    loading,
    error,
    lastCalculated,

    // Status Methods
    fetchStatusScore,
    recalculateStatus,

    // Phase Methods
    fetchPhase,
    advancePhase,
    refreshPhase,

    // Action Methods
    getNextActions,

    // Status Computed
    statusColor,
    advice,
    scoreDescription,
    detailedBreakdown,
    weakestAreas,
    strongestAreas,

    // Phase Computed
    canAdvance,
    nextPhase,
    phaseInfo,
    remainingMilestones,
    completionPercentage,
    progressLabel,
  };
};
