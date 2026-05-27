// composables/useSchoolStats.ts
import { computed } from "vue";
import type { Ref } from "vue";
import type { School } from "~/types/models";
export function useSchoolStats(schools: Ref<School[]>) {
  const stats = computed(() => [
    {
      label: "Total Schools",
      value: schools.value.length,
      icon: "i-heroicons-academic-cap",
      color: "blue" as const,
      testId: "stat-total-schools",
    },
    {
      label: "Favorites",
      value: schools.value.filter((s) => s.is_favorite).length,
      icon: "i-heroicons-star",
      color: "amber" as const,
      testId: "stat-favorites",
    },
    {
      label: "Visited",
      value: schools.value.filter(
        (s) =>
          s.status === "official_visit_scheduled" ||
          s.status === "official_visit_invited",
      ).length,
      icon: "i-heroicons-map-pin",
      color: "green" as const,
      testId: "stat-visited",
    },
    {
      label: "Contacted",
      value: schools.value.filter((s) => s.status === "contacted").length,
      icon: "i-heroicons-chat-bubble-left-right",
      color: "purple" as const,
      testId: "stat-contacted",
    },
  ]);

  return { stats };
}
