import { ref, reactive, type Ref } from "vue";
import { useInteractions } from "~/composables/useInteractions";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";
import type { Event } from "~/types/models";
import type { Database } from "~/types/database";

type InteractionType = Database["public"]["Enums"]["interaction_type"];
type SentimentType = Database["public"]["Enums"]["interaction_sentiment"];

const logger = createClientLogger("EventDetail");

/**
 * Post-"mark attended" quick interaction logging modal.
 */
export function useEventQuickLog(eventId: string, event: Ref<Event | null>) {
  const { createInteraction } = useInteractions();
  const { showToast } = useAppToast();

  const showQuickLogModal = ref(false);
  const quickLogData = reactive<{
    type: InteractionType;
    direction: "inbound" | "outbound";
    content: string;
    sentiment: SentimentType;
  }>({
    type: "in_person_visit",
    direction: "inbound",
    content: "",
    sentiment: "positive",
  });

  const handleQuickLogInteraction = async () => {
    if (!event.value || !event.value.school_id) return;

    try {
      const occurredAt = new Date(event.value.start_date).toISOString();

      await createInteraction({
        school_id: event.value.school_id,
        coach_id: null,
        event_id: eventId,
        type: quickLogData.type as InteractionType,
        direction: quickLogData.direction as "outbound" | "inbound",
        subject: `Interaction at ${event.value.name}`,
        content: quickLogData.content,
        sentiment: quickLogData.sentiment as SentimentType,
        occurred_at: occurredAt,
        logged_by: "", // Server will set from auth
        attachments: [],
      });

      // Reset and close modal
      quickLogData.type = "in_person_visit";
      quickLogData.direction = "inbound";
      quickLogData.content = "";
      quickLogData.sentiment = "positive";
      showQuickLogModal.value = false;
    } catch (err) {
      logger.error("Failed to log interaction", err);
      showToast(
        "Something went wrong logging this interaction. Please try again.",
        "error",
      );
    }
  };

  return {
    showQuickLogModal,
    quickLogData,
    handleQuickLogInteraction,
  };
}
