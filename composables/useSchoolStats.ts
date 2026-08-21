// composables/useSchoolStats.ts
import { computed } from "vue";
import type { Ref } from "vue";
import type { School, Interaction, Event } from "~/types/models";

// Interaction types that represent an actual visit. `virtual_meeting` is
// deliberately excluded — it is not a campus visit.
const VISIT_INTERACTION_TYPES = [
  "in_person_visit",
  "official_visit",
  "unofficial_visit",
] as const;

const VISIT_EVENT_TYPES = ["official_visit", "unofficial_visit"] as const;

export function useSchoolStats(
  schools: Ref<School[]>,
  interactions: Ref<Interaction[]>,
  events: Ref<Event[]>,
) {
  // School IDs with a real logged visit: a visit-type interaction, or a
  // past-dated visit event. Status is NOT a visit signal (invited/scheduled
  // ≠ visited). Built once per recompute so lookups stay O(n+m).
  const visitedSchoolIds = computed<Set<string>>(() => {
    const ids = new Set<string>();
    for (const i of interactions.value) {
      if (
        i.school_id &&
        (VISIT_INTERACTION_TYPES as readonly string[]).includes(i.type)
      ) {
        ids.add(i.school_id);
      }
    }
    const now = Date.now();
    for (const e of events.value) {
      if (
        e.school_id &&
        (VISIT_EVENT_TYPES as readonly string[]).includes(e.type) &&
        e.start_date &&
        new Date(e.start_date).getTime() <= now
      ) {
        ids.add(e.school_id);
      }
    }
    return ids;
  });

  // School IDs with at least one logged interaction of any type. "Contacted" is
  // an activity signal (a real interaction exists), not the `contacted` status
  // stage — a school can be past `contacted` in the funnel yet still counts.
  const contactedSchoolIds = computed<Set<string>>(() => {
    const ids = new Set<string>();
    for (const i of interactions.value) {
      if (i.school_id) ids.add(i.school_id);
    }
    return ids;
  });

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
      value: schools.value.filter((s) => visitedSchoolIds.value.has(s.id))
        .length,
      icon: "i-heroicons-map-pin",
      color: "green" as const,
      testId: "stat-visited",
    },
    {
      label: "Contacted",
      value: schools.value.filter((s) => contactedSchoolIds.value.has(s.id))
        .length,
      icon: "i-heroicons-chat-bubble-left-right",
      color: "purple" as const,
      testId: "stat-contacted",
    },
  ]);

  return { stats };
}
