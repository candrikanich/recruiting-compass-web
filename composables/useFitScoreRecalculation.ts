/**
 * useFitScoreRecalculation Composable
 * Manages batch recalculation of fit scores for all schools
 * Triggered when athlete profile changes
 */

import { ref } from "vue";

interface RecalculationResponse {
  success: boolean;
  updated: number;
  failed: number;
  message: string;
}

export const useFitScoreRecalculation = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Recalculate fit scores for all user's schools
   * Blocking operation: waits for completion before returning
   */
  async function recalculateAllFitScores(): Promise<RecalculationResponse> {
    loading.value = true;
    error.value = null;

    try {
      const res = await fetch("/api/athlete/fit-scores/recalculate-all", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Failed to recalculate fit scores: ${res.status}`);
      }

      const response = (await res.json()) as RecalculationResponse;

      if (!response?.success) {
        throw new Error(response?.message || "Recalculation failed");
      }

      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to recalculate fit scores";
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    recalculateAllFitScores,
    loading,
    error,
  };
};
