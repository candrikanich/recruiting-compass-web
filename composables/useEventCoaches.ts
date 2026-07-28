import { ref, computed, type Ref } from "vue";
import { useEvents } from "~/composables/useEvents";
import { useCoaches } from "~/composables/useCoaches";
import { createClientLogger } from "~/utils/logger";
import type { Event, Coach } from "~/types/models";

const logger = createClientLogger("EventDetail");

/**
 * "Coaches present at this event" list + add/remove flow for the event
 * detail page.
 *
 * NOTE (observed, not fixed - pure refactor): `schoolCoaches` is never
 * populated from `useCoaches().coaches` (the store-backed list `fetchCoaches`
 * loads into) — it stays permanently empty, so `availableCoaches` and
 * `coachesAtEvent` never reflect real data. Preserved as-is from the
 * pre-refactor page; see task-10c-report.md.
 */
export function useEventCoaches(eventId: string, event: Ref<Event | null>) {
  const { updateEvent } = useEvents();
  const { fetchCoaches } = useCoaches();

  const showAddCoach = ref(false);
  const selectedCoachId = ref("");
  const schoolCoaches = ref<Coach[]>([]);
  const coachesAtEvent = ref<Coach[]>([]);

  const eventSchoolId = computed(() => event.value?.school_id);

  const availableCoaches = computed(() => {
    const presentIds = event.value?.coaches_present || [];
    return schoolCoaches.value.filter((c) => !presentIds.includes(c.id));
  });

  const loadCoaches = async () => {
    if (!eventSchoolId.value) return;

    try {
      await fetchCoaches(eventSchoolId.value);

      const presentIds = event.value?.coaches_present || [];
      const coaches = schoolCoaches.value;
      coachesAtEvent.value = coaches.filter((c: Coach) =>
        presentIds.includes(c.id),
      );
    } catch (err) {
      logger.error("Failed to load coaches", err);
    }
  };

  const addCoach = async () => {
    if (!selectedCoachId.value || !event.value) return;

    try {
      const updatedCoaches = [
        ...(event.value.coaches_present || []),
        selectedCoachId.value,
      ];

      await updateEvent(eventId, {
        coaches_present: updatedCoaches,
      });

      showAddCoach.value = false;
      selectedCoachId.value = "";
      await loadCoaches();
    } catch (err) {
      logger.error("Failed to add coach", err);
    }
  };

  const removeCoach = async (coachId: string) => {
    if (!event.value) return;

    try {
      const updatedCoaches = (event.value.coaches_present || []).filter(
        (id) => id !== coachId,
      );

      await updateEvent(eventId, {
        coaches_present: updatedCoaches,
      });

      await loadCoaches();
    } catch (err) {
      logger.error("Failed to remove coach", err);
    }
  };

  return {
    showAddCoach,
    selectedCoachId,
    coachesAtEvent,
    availableCoaches,
    loadCoaches,
    addCoach,
    removeCoach,
  };
}
