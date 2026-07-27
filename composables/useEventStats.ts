// composables/useEventStats.ts
import { computed } from "vue";
import type { Ref } from "vue";
import type { Event } from "~/types/models";
import { formatLocalDateOnly } from "~/utils/localDate";
export function useEventStats(events: Ref<Event[]>) {
  const stats = computed(() => {
    // Today's date as a LOCAL YYYY-MM-DD string. `toISOString().split("T")[0]`
    // is UTC, so it drifts to tomorrow after ~5-8pm US local time — dropping
    // today's events from "Upcoming" for the rest of the evening.
    const todayStr = formatLocalDateOnly(new Date());

    return [
      {
        label: "Total Events",
        value: events.value.length,
        icon: "i-heroicons-calendar",
        color: "blue" as const,
        testId: "stat-total-events",
      },
      {
        label: "Upcoming",
        value: events.value.filter((e) => e.start_date >= todayStr).length,
        icon: "i-heroicons-arrow-right",
        color: "purple" as const,
        testId: "stat-upcoming",
      },
      {
        label: "Registered",
        value: events.value.filter((e) => e.registered && !e.attended).length,
        icon: "i-heroicons-check-circle",
        color: "green" as const,
        testId: "stat-registered",
      },
      {
        label: "Attended",
        value: events.value.filter((e) => e.attended).length,
        icon: "i-heroicons-check-badge",
        color: "amber" as const,
        testId: "stat-attended",
      },
    ];
  });

  return { stats };
}
