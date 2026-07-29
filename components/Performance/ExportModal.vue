<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @keydown.escape="handleClose"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white"
    >
      <!-- Header -->
      <div
        class="sticky top-0 p-6 flex items-center justify-between bg-white border-b border-slate-300"
      >
        <h2 id="export-modal-title" class="text-2xl font-bold text-slate-900">
          Export Performance Report
        </h2>
        <button
          @click="handleClose"
          aria-label="Close export performance report dialog"
          class="text-slate-600 hover:text-slate-900 transition"
        >
          <UIcon
            name="i-heroicons-x-mark-solid"
            class="w-6 h-6"
            aria-hidden="true"
          />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Report Type Selection -->
        <div role="group" aria-labelledby="export-report-type-label">
          <p
            id="export-report-type-label"
            class="block text-sm font-medium mb-3 text-slate-600"
          >
            Report Type
          </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              v-for="type in reportTypes"
              :key="type.value"
              type="button"
              :aria-pressed="selectedType === type.value"
              @click="selectedType = type.value"
              class="p-4 border-2 rounded-lg cursor-pointer transition text-left"
              :class="
                selectedType === type.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-300 bg-white'
              "
            >
              <div class="text-2xl mb-2" aria-hidden="true">
                {{ type.icon }}
              </div>
              <div class="font-semibold text-slate-900">{{ type.label }}</div>
              <div class="text-xs mt-1 text-slate-600">
                {{ type.description }}
              </div>
            </button>
          </div>
        </div>

        <!-- Metric Type Selector (if Individual) -->
        <div v-if="selectedType === 'individual'">
          <label
            for="export-metric"
            class="block text-sm font-medium mb-2 text-slate-600"
            >Select Metric</label
          >
          <select
            id="export-metric"
            v-model="selectedMetric"
            class="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:border-transparent"
          >
            <option value="">Choose metric type...</option>
            <option
              v-for="type in availableMetricTypes"
              :key="type"
              :value="type"
            >
              {{ getMetricLabel(type) }}
            </option>
          </select>
        </div>

        <!-- Format Selection -->
        <div role="group" aria-labelledby="export-format-label">
          <p
            id="export-format-label"
            class="block text-sm font-medium mb-2 text-slate-600"
          >
            Export Format
          </p>
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="formatPDF"
                class="w-4 h-4 rounded-sm accent-blue-600"
              />
              <span class="ml-2 text-sm font-medium text-slate-600"
                >PDF (Printable)</span
              >
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="formatText"
                class="w-4 h-4 rounded-sm accent-blue-600"
              />
              <span class="ml-2 text-sm font-medium text-slate-600"
                >Text Summary</span
              >
            </label>
          </div>
        </div>

        <!-- Coach Name (for text summary) -->
        <div v-if="formatText">
          <label
            for="export-coach-name"
            class="block text-sm font-medium mb-2 text-slate-600"
            >Coach Name (for email)</label
          >
          <input
            id="export-coach-name"
            v-model="coachName"
            type="text"
            placeholder="e.g., Coach Smith"
            class="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:border-transparent"
          />
        </div>

        <!-- Date Range Filters -->
        <div>
          <label
            for="export-date-range"
            class="block text-sm font-medium mb-2 text-slate-600"
            >Date Range</label
          >
          <select
            id="export-date-range"
            v-model="dateRange"
            class="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 180 Days</option>
          </select>
        </div>

        <!-- Verified Only -->
        <div class="flex items-center">
          <input
            id="export-verified-only"
            type="checkbox"
            v-model="verifiedOnly"
            class="w-4 h-4 rounded-sm accent-blue-600"
          />
          <label
            for="export-verified-only"
            class="ml-2 text-sm font-medium text-slate-600"
            >Verified Metrics Only</label
          >
        </div>
      </div>

      <!-- Footer -->
      <div
        class="sticky bottom-0 p-6 flex gap-4 justify-end bg-slate-50 border-t border-slate-300"
      >
        <button
          @click="handleClose"
          class="px-6 py-2 font-semibold rounded-lg transition bg-slate-200 text-slate-900 hover:bg-slate-300"
        >
          Cancel
        </button>
        <button
          @click="handleExport"
          :disabled="!canExport || isExporting"
          class="px-6 py-2 text-white font-semibold rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isExporting ? "Generating..." : "Export Report" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useUserStore } from "~/stores/user";
import {
  generateIndividualMetricReport,
  generateComprehensiveReport,
  generateEventReport,
} from "~/utils/reportGenerators";
import {
  downloadFile,
  generateFilename,
  getMimeType,
} from "~/utils/exportHelpers";
import { getMetricLabel } from "~/utils/textTemplates";
import { useAppToast } from "~/composables/useAppToast";
import type { PerformanceMetric, Event } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("ExportModal");

const { showToast } = useAppToast();

const props = defineProps<{
  metrics: PerformanceMetric[];
  events?: Event[];
  context: "dashboard" | "event" | "timeline";
  eventId?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

onMounted(async () => {
  await nextTick();
  activate();
});

const handleClose = () => {
  deactivate();
  emit("close");
};

const userStore = useUserStore();
const selectedType = ref("comprehensive");
const selectedMetric = ref("");
const formatPDF = ref(true);
const formatText = ref(false);
const coachName = ref("");
const dateRange = ref("all");
const verifiedOnly = ref(false);
const isExporting = ref(false);

const reportTypes = [
  {
    value: "individual",
    icon: "📊",
    label: "Individual Metric",
    description: "Single metric with trend",
  },
  {
    value: "comprehensive",
    icon: "📈",
    label: "Complete Profile",
    description: "All metrics summary",
  },
  {
    value: "event",
    icon: "🎯",
    label: "Event Report",
    description: "Event-specific data",
  },
];

const availableMetricTypes = computed(() => {
  const types = new Set(props.metrics.map((m) => m.metric_type));
  return Array.from(types);
});

const canExport = computed(() => {
  if (!formatPDF.value && !formatText.value) return false;
  if (selectedType.value === "individual" && !selectedMetric.value)
    return false;
  if (selectedType.value === "event" && !props.eventId) return false;
  return true;
});

const handleExport = async () => {
  isExporting.value = true;

  try {
    const athleteName = userStore.currentUser?.full_name || "Athlete";

    // Filter metrics based on selections
    let filteredMetrics = props.metrics;
    if (verifiedOnly.value)
      filteredMetrics = filteredMetrics.filter((m) => m.verified);
    if (dateRange.value !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange.value));
      filteredMetrics = filteredMetrics.filter(
        (m) => new Date(m.recorded_date) >= cutoff,
      );
    }

    // Generate reports based on selected formats
    const formats = [];
    if (formatPDF.value) formats.push("pdf");
    if (formatText.value) formats.push("text");

    for (const format of formats) {
      let report;

      if (selectedType.value === "individual") {
        report = await generateIndividualMetricReport(selectedMetric.value, {
          metrics: filteredMetrics,
          format: format as "pdf" | "text",
          athleteName,
          coachName: coachName.value,
        });
      } else if (selectedType.value === "comprehensive") {
        report = await generateComprehensiveReport({
          metrics: filteredMetrics,
          format: format as "pdf" | "text",
          athleteName,
          coachName: coachName.value,
        });
      } else if (selectedType.value === "event") {
        const event = props.events?.find((e) => e.id === props.eventId);
        if (!event) continue;

        const eventMetrics = filteredMetrics.filter(
          (m) => m.event_id === props.eventId,
        );
        report = await generateEventReport({
          metrics: eventMetrics,
          format: format as "pdf" | "text",
          athleteName,
          event,
        });
      }

      if (report) {
        const filename = generateFilename(
          selectedType.value,
          format === "pdf" ? "pdf" : "txt",
        );
        const mimeType = getMimeType(format === "pdf" ? "pdf" : "text");
        downloadFile(report, filename, mimeType);
      }
    }

    handleClose();
  } catch (error) {
    logger.error("Export failed", error);
    showToast(
      "Something went wrong generating the report. Please try again.",
      "error",
    );
  } finally {
    isExporting.value = false;
  }
};
</script>
