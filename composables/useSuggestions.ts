import { ref, computed } from "vue";
import type { Suggestion } from "~/types/timeline";

export function useSuggestions() {
  const suggestions = ref<Suggestion[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSuggestions(
    location: "dashboard" | "school_detail",
    schoolId?: string,
  ): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams({ location });
      if (schoolId) params.append("schoolId", schoolId);

      const response = await $fetch(`/api/suggestions?${params}`);
      suggestions.value = response.suggestions;
    } catch (e: unknown) {
      error.value =
        e instanceof Error ? e.message : "Failed to fetch suggestions";
    } finally {
      loading.value = false;
    }
  }

  async function dismissSuggestion(suggestionId: string): Promise<void> {
    try {
      await $fetch(`/api/suggestions/${suggestionId}/dismiss`, {
        method: "PATCH",
      });
      suggestions.value = suggestions.value.filter(
        (s) => s.id !== suggestionId,
      );
    } catch (e: unknown) {
      error.value =
        e instanceof Error ? e.message : "Failed to dismiss suggestion";
    }
  }

  async function completeSuggestion(suggestionId: string): Promise<void> {
    try {
      await $fetch(`/api/suggestions/${suggestionId}/complete`, {
        method: "PATCH",
      });
      suggestions.value = suggestions.value.filter(
        (s) => s.id !== suggestionId,
      );
    } catch (e: unknown) {
      error.value =
        e instanceof Error ? e.message : "Failed to complete suggestion";
    }
  }

  const dashboardSuggestions = computed(() => suggestions.value.slice(0, 3));
  const highUrgencySuggestions = computed(() =>
    suggestions.value.filter((s) => s.urgency === "high"),
  );

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    dismissSuggestion,
    completeSuggestion,
    dashboardSuggestions,
    highUrgencySuggestions,
  };
}
