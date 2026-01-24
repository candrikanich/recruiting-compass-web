/**
 * usePhaseCalculation Composable
 * Manages phase calculation and progression
 */

import { ref, computed, type ComputedRef, type Ref } from "vue";
import type { Phase, MilestoneProgress } from "~/types/timeline";
import type { AthleteAPI } from "~/types/api/athlete";
import {
  calculatePhase,
  getMilestoneProgress,
  canAdvancePhase,
  getNextPhase,
  buildPhaseMilestoneData,
  PHASE_INFO,
} from "~/utils/phaseCalculation";
import { useAuthFetch } from "~/composables/useAuthFetch";

export const usePhaseCalculation = (): {
  currentPhase: Ref<Phase>;
  milestoneProgress: Ref<MilestoneProgress | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchPhase: () => Promise<AthleteAPI.GetPhaseResponse>;
  advancePhase: () => Promise<AthleteAPI.AdvancePhaseResponse>;
  refreshPhase: () => Promise<AthleteAPI.GetPhaseResponse>;
  canAdvance: ComputedRef<boolean>;
  nextPhase: ComputedRef<Phase | null>;
  phaseInfo: ComputedRef<(typeof PHASE_INFO)[Phase]>;
  remainingMilestones: ComputedRef<string[]>;
  completionPercentage: ComputedRef<number>;
  progressLabel: ComputedRef<string>;
} => {
  const currentPhase = ref<Phase>("freshman");
  const milestoneProgress = ref<MilestoneProgress | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch and calculate current phase
   */
  const fetchPhase = async (): Promise<AthleteAPI.GetPhaseResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const { $fetchAuth } = useAuthFetch();
      const response =
        await $fetchAuth<AthleteAPI.GetPhaseResponse>("/api/athlete/phase");

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

  /**
   * Attempt to advance to next phase
   */
  const advancePhase = async (): Promise<AthleteAPI.AdvancePhaseResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const { $fetchAuth } = useAuthFetch();
      const response = await $fetchAuth<AthleteAPI.AdvancePhaseResponse>(
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

  /**
   * Refresh phase data
   */
  const refreshPhase = async () => {
    return fetchPhase();
  };

  /**
   * Check if phase advancement is possible
   */
  const canAdvance = computed((): boolean => {
    if (!milestoneProgress.value) return false;
    return milestoneProgress.value.remaining.length === 0;
  });

  /**
   * Get next phase if available
   */
  const nextPhase = computed((): Phase | null => {
    return getNextPhase(currentPhase.value);
  });

  /**
   * Get phase info
   */
  const phaseInfo = computed(() => {
    return PHASE_INFO[currentPhase.value];
  });

  /**
   * Get remaining milestones
   */
  const remainingMilestones = computed(() => {
    return milestoneProgress.value?.remaining ?? [];
  });

  /**
   * Get completion percentage
   */
  const completionPercentage = computed(() => {
    return milestoneProgress.value?.percentComplete ?? 0;
  });

  /**
   * Format phase progress as readable string
   */
  const progressLabel = computed(() => {
    if (!milestoneProgress.value) return "";
    const completed = milestoneProgress.value.completed.length;
    const total = milestoneProgress.value.required.length;
    return `${completed}/${total} milestones complete`;
  });

  return {
    // State
    currentPhase,
    milestoneProgress,
    loading,
    error,

    // Methods
    fetchPhase,
    advancePhase,
    refreshPhase,

    // Computed
    canAdvance,
    nextPhase,
    phaseInfo,
    remainingMilestones,
    completionPercentage,
    progressLabel,
  };
};
