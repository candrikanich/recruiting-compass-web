import { ref, computed } from "vue";
import type { Suggestion } from "~/types/timeline";

export function useSuggestions() {
  const suggestions = ref<Suggestion[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pendingCount = ref(0);

  async function fetchSuggestions(
    location: "dashboard" | "school_detail",
    schoolId?: string,
    options?: { onUpdate?: (newCount: number) => void },
  ): Promise<void> {
    const previousCount = suggestions.value.length;
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams({ location });
      if (schoolId) params.append("schoolId", schoolId);

      const response = await $fetch(`/api/suggestions?${params}`);
      suggestions.value = response.suggestions;
      pendingCount.value = response.pendingCount || 0;

      // Notify if new suggestions were added
      const newCount = suggestions.value.length - previousCount;
      if (newCount > 0 && options?.onUpdate) {
        options.onUpdate(newCount);
      }
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

  async function surfaceMoreSuggestions(): Promise<void> {
    try {
      await $fetch("/api/suggestions/surface", { method: "POST" });
      await fetchSuggestions("dashboard");
    } catch (e: unknown) {
      error.value =
        e instanceof Error ? e.message : "Failed to surface more suggestions";
    }
  }

  const dashboardSuggestions = computed(() => suggestions.value.slice(0, 3));
  const highUrgencySuggestions = computed(() =>
    suggestions.value.filter((s) => s.urgency === "high"),
  );
  const moreCount = computed(() => Math.max(0, pendingCount.value - suggestions.value.length));

  return {
    suggestions,
    loading,
    error,
    pendingCount,
    moreCount,
    fetchSuggestions,
    dismissSuggestion,
    completeSuggestion,
    surfaceMoreSuggestions,
    dashboardSuggestions,
    highUrgencySuggestions,
  };
}
