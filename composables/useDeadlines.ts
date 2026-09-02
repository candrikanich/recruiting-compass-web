import { ref, computed } from "vue";
import { createClientLogger } from "~/utils/logger";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useSchoolStore } from "~/stores/schools";
import { useRecruitingDeadlines } from "~/composables/useRecruitingDeadlines";
import { mergeDeadlines, groupByMonth, splitUpcomingPast } from "~/utils/deadlines";
import type { UnifiedDeadline } from "~/types/deadline";
import type { AppSport, Division } from "~/utils/recruitingCalendar/types";

const logger = createClientLogger("deadlines");

export function useDeadlines() {
  const { $fetchAuth } = useAuthFetch();
  const { getPlayerDetails } = usePreferenceManager();
  const schoolStore = useSchoolStore();

  const deadlines = ref<
    Array<{
      id: string;
      label: string;
      deadline_date: string;
      category: string;
      school_id?: string;
    }>
  >([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const { systemDeadlines, isStale } = useRecruitingDeadlines(
    () => (getPlayerDetails()?.primary_sport as AppSport | undefined) ?? null,
    () =>
      Array.from(
        new Set(
          schoolStore.schools
            .map((s) => s.division)
            .filter((d): d is Division => d != null),
        ),
      ),
    () => getPlayerDetails()?.graduation_year ?? null,
  );

  const userDeadlines = computed<UnifiedDeadline[]>(() =>
    deadlines.value.map((d) => ({
      id: d.id,
      label: d.label,
      date: d.deadline_date,
      category: d.category as UnifiedDeadline["category"],
      source: "user",
      schoolId: d.school_id,
    })),
  );

  const unifiedDeadlines = computed<UnifiedDeadline[]>(() =>
    mergeDeadlines(userDeadlines.value, systemDeadlines.value),
  );

  const today = computed(() => new Date().toISOString().slice(0, 10));

  const splitDeadlines = computed(() =>
    splitUpcomingPast(unifiedDeadlines.value, today.value),
  );
  const upcomingDeadlines = computed(() => splitDeadlines.value.upcoming);
  const pastDeadlines = computed(() => splitDeadlines.value.past);

  const groupedByMonth = computed(() => groupByMonth(unifiedDeadlines.value));

  async function fetchDeadlines() {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetchAuth<{ deadlines: typeof deadlines.value }>(
        "/api/deadlines",
      );
      deadlines.value = response.deadlines;
    } catch {
      error.value = "Failed to load deadlines";
    } finally {
      loading.value = false;
    }
  }

  async function createDeadline(payload: {
    label: string;
    deadline_date: string;
    category: string;
    school_id?: string;
  }): Promise<{
    id: string;
    label: string;
    deadline_date: string;
    category: string;
    school_id?: string;
  }> {
    try {
      const result = await $fetchAuth<{
        success: boolean;
        deadline: {
          id: string;
          label: string;
          deadline_date: string;
          category: string;
          school_id?: string;
        };
      }>("/api/deadlines", { method: "POST", body: payload });
      await fetchDeadlines();
      return result.deadline;
    } catch (err) {
      logger.error("Failed to create deadline", err);
      throw err;
    }
  }

  async function removeDeadline(id: string) {
    try {
      await $fetchAuth(`/api/deadlines/${id}`, { method: "DELETE" });
      deadlines.value = deadlines.value.filter((d) => d.id !== id);
    } catch (err) {
      logger.error("Failed to remove deadline", err);
      throw err;
    }
  }

  return {
    deadlines,
    userDeadlines,
    systemDeadlines,
    unifiedDeadlines,
    upcomingDeadlines,
    pastDeadlines,
    groupedByMonth,
    isStale,
    loading,
    error,
    fetchDeadlines,
    createDeadline,
    removeDeadline,
  };
}
