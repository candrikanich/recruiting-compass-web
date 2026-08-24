<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <PageHeader
      title="Performance Timeline & Analytics"
      description="Track your progress over time and compare metrics across events"
    />

    <!-- Sub-navigation tabs -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <nav class="flex gap-6">
          <NuxtLink
            to="/performance"
            class="border-b-2 border-transparent px-1 pb-3 font-semibold text-gray-600 hover:text-gray-900"
          >
            Performance Overview
          </NuxtLink>
          <NuxtLink
            to="/performance/timeline"
            class="border-b-2 border-blue-600 px-1 pb-3 font-semibold text-blue-600"
          >
            Timeline & Analytics
          </NuxtLink>
        </nav>
      </div>
    </div>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Filters Bar -->
      <PerformanceTimelineFilters
        v-model:dateRange="dateRange"
        v-model:verifiedOnly="verifiedOnly"
        @export="handleExport"
        @advanced-export="showExportModal = true"
      />

      <!-- Loading State -->
      <div v-if="loading" class="space-y-8">
        <div class="h-96 animate-pulse rounded-lg bg-white p-6 shadow-sm"></div>
        <div class="h-96 animate-pulse rounded-lg bg-white p-6 shadow-sm"></div>
      </div>

      <!-- Charts -->
      <div v-else class="space-y-8">
        <!-- One chart per recorded metric type, ordered by the athlete's sport
             (registry-driven; no hard-coded baseball categories). -->
        <PerformanceChart
          v-for="section in chartSections"
          :key="section.type"
          :title="section.title"
          :metrics="section.metrics"
          :metric-types="[section.type]"
          :show-comparison="true"
        />

        <!-- Empty state -->
        <div
          v-if="chartSections.length === 0"
          class="rounded-lg bg-white p-12 text-center text-slate-600 shadow-sm"
        >
          No performance metrics recorded yet
        </div>

        <!-- Radar Chart: Current Performance Snapshot -->
        <PerformanceRadarChart :latest-metrics="latestMetricsByType" />
      </div>

      <!-- Export Modal -->
      <ExportModal
        v-if="showExportModal"
        :metrics="filteredMetrics"
        :events="filteredEvents"
        context="timeline"
        @close="showExportModal = false"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent } from "vue";
import { usePerformance } from "~/composables/usePerformance";
import { useEvents } from "~/composables/useEvents";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { metricTypesForSport, getMetricDef } from "~/utils/metrics/canonical";
const ExportModal = defineAsyncComponent(
  () => import("~/components/Performance/ExportModal.vue"),
);
import type { PerformanceMetric } from "~/types/models";

definePageMeta({ middleware: "auth" });

// Composables
const { metrics, fetchMetrics, loading: metricsLoading } = usePerformance();
const { events, fetchEvents, loading: eventsLoading } = useEvents();

// State
const dateRange = ref({
  preset: "last_3_months",
  startDate: "",
  endDate: "",
});
const verifiedOnly = ref(false);
const showExportModal = ref(false);

const loading = computed(() => metricsLoading.value || eventsLoading.value);

// Computed: Filter metrics by verification
const filteredMetrics = computed(() => {
  if (!verifiedOnly.value) return metrics.value;
  return metrics.value.filter((m) => m.verified);
});

// Athlete's primary sport — drives the registry-backed chart grouping.
const { playerPrefs, getPlayerDetails } = usePreferenceManager();
const primarySport = ref<string | null>(null);

// Computed: one chart section per recorded metric type, ordered by the sport's
// registry ordering (recorded custom/off-sport keys appended). No baseball
// categories — the registry has no category metadata, so grouping is generic
// (one section per metric type), titled from the registry label.
const chartSections = computed(() => {
  const recorded = new Set(filteredMetrics.value.map((m) => m.metric_type));
  const ordered = metricTypesForSport(primarySport.value).filter((type) =>
    recorded.has(type),
  );
  const extras = Array.from(recorded).filter(
    (type) => type && !ordered.includes(type),
  );
  return [...ordered, ...extras].map((type) => ({
    type,
    title: getMetricDef(type).label,
    metrics: filteredMetrics.value.filter((m) => m.metric_type === type),
  }));
});

// Computed: Filter events by date range
const filteredEvents = computed(() => {
  if (!dateRange.value.startDate || !dateRange.value.endDate)
    return events.value;
  return events.value.filter(
    (e) =>
      e.start_date >= dateRange.value.startDate &&
      e.start_date <= dateRange.value.endDate,
  );
});

// Computed: Latest metric per recorded type, for the radar snapshot.
const latestMetricsByType = computed(() => {
  const latest: Record<string, PerformanceMetric> = {};
  const sorted = [...filteredMetrics.value].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
  for (const metric of sorted) {
    if (!latest[metric.metric_type]) {
      latest[metric.metric_type] = metric;
    }
  }
  return latest;
});

// Methods
const calculateDateRange = () => {
  const now = new Date();
  let start = new Date();

  switch (dateRange.value.preset) {
    case "last_30_days":
      start.setDate(now.getDate() - 30);
      break;
    case "last_3_months":
      start.setMonth(now.getMonth() - 3);
      break;
    case "last_6_months":
      start.setMonth(now.getMonth() - 6);
      break;
    case "last_12_months":
      start.setMonth(now.getMonth() - 12);
      break;
    case "all_time":
      start = new Date("2020-01-01");
      break;
    case "custom":
      return;
  }

  dateRange.value.startDate = start.toISOString().split("T")[0];
  dateRange.value.endDate = now.toISOString().split("T")[0];
};

const handleExport = (format: "csv" | "json") => {
  if (format === "csv") {
    const csv = convertMetricsToCSV(filteredMetrics.value);
    downloadFile(
      csv,
      `performance-timeline-${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv",
    );
  } else {
    const json = JSON.stringify(filteredMetrics.value, null, 2);
    downloadFile(
      json,
      `performance-timeline-${new Date().toISOString().split("T")[0]}.json`,
      "application/json",
    );
  }
};

const convertMetricsToCSV = (metricsData: PerformanceMetric[]): string => {
  const headers = [
    "Date",
    "Metric Type",
    "Value",
    "Unit",
    "Event ID",
    "Verified",
    "Notes",
  ];
  const rows = metricsData.map((m) => [
    m.recorded_date,
    m.metric_type,
    m.value.toString(),
    m.unit || "",
    m.event_id || "",
    m.verified ? "Yes" : "No",
    m.notes || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Lifecycle
onMounted(async () => {
  calculateDateRange();
  await Promise.all([
    fetchMetrics({
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
    }),
    fetchEvents(),
  ]);
  await playerPrefs.loadPreferences();
  primarySport.value = getPlayerDetails()?.primary_sport ?? null;
});

// Watchers
watch(
  () => dateRange.value.preset,
  () => {
    if (dateRange.value.preset !== "custom") {
      calculateDateRange();
    }
  },
);

watch(
  [() => dateRange.value.startDate, () => dateRange.value.endDate],
  async () => {
    if (dateRange.value.startDate && dateRange.value.endDate) {
      await fetchMetrics({
        startDate: dateRange.value.startDate,
        endDate: dateRange.value.endDate,
      });
    }
  },
);
</script>
