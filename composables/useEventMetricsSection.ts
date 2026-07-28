import { ref, reactive, type Ref } from "vue";
import { usePerformance } from "~/composables/usePerformance";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";
import type { Event, PerformanceMetric } from "~/types/models";

const logger = createClientLogger("EventDetail");

/**
 * "Metrics recorded at this event" list + log-metric form + delete flow.
 */
export function useEventMetricsSection(
  eventId: string,
  event: Ref<Event | null>,
) {
  const { createMetric, deleteMetric: deleteMetricAPI } = usePerformance();
  const { showToast } = useAppToast();

  const eventMetrics = ref<PerformanceMetric[]>([]);
  const metricLoading = ref(false);
  const showMetricForm = ref(false);
  const showExportModal = ref(false);

  const newMetric = reactive({
    metric_type: "",
    value: null as number | null,
    unit: "",
    notes: "",
    verified: false,
  });

  const getMetricLabel = (type: string): string => {
    const labels: Record<string, string> = {
      velocity: "Fastball Velocity",
      exit_velo: "Exit Velocity",
      sixty_time: "60-Yard Dash",
      pop_time: "Pop Time",
      batting_avg: "Batting Average",
      era: "ERA",
      strikeouts: "Strikeouts",
      other: "Other Metric",
    };
    return labels[type] || type;
  };

  const loadEventMetrics = async () => {
    try {
      const { metrics, fetchMetrics } = usePerformance();
      await fetchMetrics({ eventId });
      eventMetrics.value = metrics.value.filter((m) => m.event_id === eventId);
    } catch (err) {
      logger.error("Failed to load event metrics", err);
    }
  };

  const handleAddMetric = async () => {
    try {
      metricLoading.value = true;
      await createMetric({
        metric_type: newMetric.metric_type as
          | "velocity"
          | "exit_velo"
          | "sixty_time"
          | "pop_time"
          | "batting_avg"
          | "era"
          | "strikeouts"
          | "other",
        value: newMetric.value!,
        recorded_date: event.value!.start_date,
        unit: newMetric.unit || "unit",
        notes: newMetric.notes || null,
        verified: newMetric.verified,
        event_id: eventId,
      });

      // Reset form
      newMetric.metric_type = "";
      newMetric.value = null;
      newMetric.unit = "";
      newMetric.notes = "";
      newMetric.verified = false;
      showMetricForm.value = false;

      // Reload metrics
      await loadEventMetrics();
    } catch (err) {
      logger.error("Failed to log metric", err);
    } finally {
      metricLoading.value = false;
    }
  };

  const isDeleteMetricDialogOpen = ref(false);
  const metricToDeleteId = ref<string | null>(null);

  const deleteMetric = (metricId: string) => {
    metricToDeleteId.value = metricId;
    isDeleteMetricDialogOpen.value = true;
  };

  const confirmDeleteMetric = async () => {
    const metricId = metricToDeleteId.value;
    isDeleteMetricDialogOpen.value = false;
    metricToDeleteId.value = null;
    if (!metricId) return;
    try {
      await deleteMetricAPI(metricId);
      await loadEventMetrics();
    } catch (err) {
      logger.error("Failed to delete metric", err);
      showToast(
        "Something went wrong deleting this metric. Please try again.",
        "error",
      );
    }
  };

  const cancelDeleteMetric = () => {
    isDeleteMetricDialogOpen.value = false;
    metricToDeleteId.value = null;
  };

  return {
    eventMetrics,
    metricLoading,
    showMetricForm,
    showExportModal,
    newMetric,
    getMetricLabel,
    loadEventMetrics,
    handleAddMetric,
    isDeleteMetricDialogOpen,
    deleteMetric,
    confirmDeleteMetric,
    cancelDeleteMetric,
  };
}
