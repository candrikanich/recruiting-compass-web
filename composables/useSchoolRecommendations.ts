import { ref } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useUserStore } from "~/stores/user";
import type {
  DismissSchoolRecommendationResponse,
  SchoolRecommendation,
  SchoolRecommendationSignals,
  SchoolRecommendationsResponse,
} from "~/types/schoolRecommendations";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useSchoolRecommendations");

export function useSchoolRecommendations() {
  const { $fetchAuth } = useAuthFetch();
  const family = useFamilyCtx();
  const userStore = useUserStore();

  const recommendations = ref<SchoolRecommendation[]>([]);
  const signals = ref<SchoolRecommendationSignals | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function athleteQuery(): { athleteId?: string } {
    const athleteId = family.activeAthleteId?.value;
    const callerId = userStore.user?.id;
    if (athleteId && callerId && athleteId !== callerId) {
      return { athleteId };
    }
    return {};
  }

  async function fetchRecommendations(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const result = await $fetchAuth<SchoolRecommendationsResponse>(
        "/api/schools/recommendations",
        { query: athleteQuery() },
      );
      recommendations.value = result.recommendations;
      signals.value = result.signals;
    } catch (err) {
      logger.warn("Failed to load school recommendations", err);
      error.value = "Could not load recommended schools.";
      recommendations.value = [];
    } finally {
      loading.value = false;
    }
  }

  function removeRecommendation(catalogKey: string): void {
    recommendations.value = recommendations.value.filter(
      (row) => row.catalogKey !== catalogKey,
    );
  }

  async function dismissRecommendation(catalogKey: string): Promise<void> {
    const previous = recommendations.value;
    removeRecommendation(catalogKey);
    try {
      await $fetchAuth<DismissSchoolRecommendationResponse>(
        "/api/schools/recommendations/dismiss",
        {
          method: "POST",
          body: {
            catalogKey,
            ...athleteQuery(),
          },
        },
      );
    } catch (err) {
      recommendations.value = previous;
      logger.warn("Failed to dismiss school recommendation", err);
      error.value = "Could not dismiss that school.";
      throw err;
    }
  }

  return {
    recommendations,
    signals,
    loading,
    error,
    fetchRecommendations,
    dismissRecommendation,
    removeRecommendation,
  };
}
