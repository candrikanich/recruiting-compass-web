import { ref, reactive, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useEvents } from "~/composables/useEvents";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";
import type { Event } from "~/types/models";

const logger = createClientLogger("EventDetail");

/**
 * Core event data, edit-modal, delete-modal, and label/format helpers
 * for the event detail page.
 */
export function useEventDetail(eventId: string) {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { fetchEvent, deleteEvent: deleteEventAPI, updateEvent } = useEvents();

  const event = ref<Event | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const showEditForm = ref(false);
  const isUpdating = ref(false);

  const editFormData = reactive({
    name: "",
    type: "",
    location: "",
    start_date: "",
    end_date: "",
    cost: 0,
    performance_notes: "",
  });

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      showcase: "Showcase",
      camp: "Camp",
      official_visit: "Official Visit",
      unofficial_visit: "Unofficial Visit",
      game: "Game",
    };
    return labels[type] || type;
  };

  const getSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      email: "Email",
      flyer: "Flyer",
      web_search: "Web Search",
      recommendation: "Recommendation",
      friend: "Friend",
      other: "Other",
    };
    return labels[source] || source;
  };

  const formatDateRange = (
    startDate: string,
    endDate?: string | null,
  ): string => {
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const startStr = new Date(
      startYear,
      startMonth - 1,
      startDay,
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!endDate || endDate === startDate) return startStr;
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    const endStr = new Date(endYear, endMonth - 1, endDay).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    );
    return `${startStr} - ${endStr}`;
  };

  const openDirections = () => {
    if (!event.value) return;
    let query = "";
    if (event.value.address) query += event.value.address;
    if (event.value.city) query += (query ? ", " : "") + event.value.city;
    if (event.value.state) query += (query ? ", " : "") + event.value.state;

    if (query.trim()) {
      const encodedQuery = encodeURIComponent(query);
      window.open(
        `https://www.google.com/maps/search/${encodedQuery}`,
        "_blank",
      );
    }
  };

  const markAsAttended = async (onAttended: () => void) => {
    if (!event.value) return;

    try {
      await updateEvent(eventId, { attended: true });
      event.value.attended = true;
      onAttended();
    } catch (err) {
      logger.error("Failed to mark event as attended", err);
    }
  };

  const openEditForm = () => {
    if (event.value) {
      editFormData.name = event.value.name;
      editFormData.type = event.value.type;
      editFormData.location = event.value.location || "";
      editFormData.start_date = event.value.start_date.split("T")[0];
      editFormData.end_date = event.value.end_date
        ? event.value.end_date.split("T")[0]
        : "";
      editFormData.cost = event.value.cost || 0;
      editFormData.performance_notes = event.value.performance_notes || "";
      showEditForm.value = true;
    }
  };

  const handleUpdateEvent = async () => {
    if (!event.value) return;

    try {
      isUpdating.value = true;
      await updateEvent(eventId, {
        name: editFormData.name,
        type: editFormData.type as
          "camp" | "showcase" | "official_visit" | "unofficial_visit" | "game",
        location: editFormData.location || null,
        start_date: editFormData.start_date,
        end_date: editFormData.end_date || null,
        cost:
          editFormData.cost && typeof editFormData.cost === "number"
            ? editFormData.cost
            : null,
        performance_notes: editFormData.performance_notes || null,
      });

      // Reload event data
      event.value = await fetchEvent(eventId);
      showEditForm.value = false;
    } catch (err) {
      logger.error("Failed to update event", err);
      error.value =
        err instanceof Error ? err.message : "Failed to update event";
    } finally {
      isUpdating.value = false;
    }
  };

  const isDeleteEventDialogOpen = ref(false);

  const deleteEvent = () => {
    isDeleteEventDialogOpen.value = true;
  };

  const confirmDeleteEvent = async () => {
    isDeleteEventDialogOpen.value = false;
    try {
      await deleteEventAPI(eventId);
      await router.push("/events");
    } catch (err) {
      logger.error("Failed to delete event", err);
      showToast(
        "Something went wrong deleting this event. Please try again.",
        "error",
      );
    }
  };

  const cancelDeleteEvent = () => {
    isDeleteEventDialogOpen.value = false;
  };

  const load = async () => {
    try {
      loading.value = true;
      event.value = await fetchEvent(eventId);
      if (!event.value) {
        error.value = "Event not found";
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load event";
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  return {
    event: event as Ref<Event | null>,
    loading,
    error,
    showEditForm,
    isUpdating,
    editFormData,
    getEventTypeLabel,
    getSourceLabel,
    formatDateRange,
    openDirections,
    markAsAttended,
    openEditForm,
    handleUpdateEvent,
    isDeleteEventDialogOpen,
    deleteEvent,
    confirmDeleteEvent,
    cancelDeleteEvent,
    load,
  };
}
