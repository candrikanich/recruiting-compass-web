<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <PageHeader
      title="Analytics"
      description="Comprehensive recruiting metrics and performance insights"
    />

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Date Range Controls -->
      <DateRangeToolbar
        :date-range="dateRange"
        @update:dateRange="handleDateRangeChange"
      />

      <!-- Summary Stats Row -->
      <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Schools"
          :value="stats.totalSchools"
          border-color="#3b82f6"
          icon="🏫"
          :show-icon="true"
        />
        <StatCard
          label="Total Interactions"
          :value="stats.totalInteractions"
          border-color="#10b981"
          icon="💬"
          :show-icon="true"
        />
        <StatCard
          label="Offer Count"
          :value="stats.totalOffers"
          border-color="#f59e0b"
          icon="📝"
          :show-icon="true"
        />
        <StatCard
          label="Commitments"
          :value="stats.commitments"
          border-color="#ef4444"
          icon="✅"
          :show-icon="true"
        />
      </div>

      <!-- Charts Grid -->
      <div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <!-- Interaction Type Distribution (Pie Chart) -->
        <div>
          <PieChart
            title="Interaction Types"
            :data="chartData.interactionTypes"
            chart-height="350px"
            :show-summary="true"
            @segment-click="handleInteractionTypeClick"
          />
        </div>

        <!-- Sentiment Breakdown (Pie Chart) -->
        <div>
          <PieChart
            title="Sentiment Breakdown"
            :data="chartData.sentiments"
            chart-height="350px"
            :show-summary="true"
          />
        </div>

        <!-- Recruiting Pipeline (Funnel Chart) -->
        <div>
          <FunnelChart
            title="Recruiting Pipeline"
            :stages="chartData.pipeline"
            @stage-click="handlePipelineStageClick"
          />
        </div>

        <!-- School Status Distribution (Pie Chart) -->
        <div>
          <PieChart
            title="School Status"
            :data="chartData.schoolStatus"
            chart-height="350px"
            :show-summary="true"
          />
        </div>
      </div>

      <!-- Performance Correlation (Scatter Chart) -->
      <div class="mb-8">
        <ScatterChart
          title="Performance Correlation Analysis"
          :datasets="chartData.performanceData"
          :x-label="performanceScatterXLabel"
          y-label="Distance (feet)"
          chart-height="400px"
          :show-stats="true"
          :show-trend-line="true"
        />
      </div>

      <!-- Export Actions -->
      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div
          class="flex flex-col items-center justify-between gap-4 md:flex-row"
        >
          <h3 class="text-lg font-semibold text-gray-900">Export Analytics</h3>
          <div class="flex gap-3">
            <button
              data-testid="export-csv-button"
              @click="handleExport('csv')"
              class="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Export as CSV
            </button>
            <button
              data-testid="export-excel-button"
              @click="handleExport('excel')"
              class="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Export as Excel
            </button>
            <button
              data-testid="export-pdf-button"
              @click="handleExport('pdf')"
              class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              Export as PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import DateRangeToolbar from "~/components/Analytics/DateRangeToolbar.vue";
import StatCard from "~/components/Analytics/StatCard.vue";
import PieChart from "~/components/Analytics/PieChart.vue";
import FunnelChart from "~/components/Analytics/FunnelChart.vue";
import ScatterChart from "~/components/Analytics/ScatterChart.vue";
import { getMetricDef } from "~/utils/metrics/canonical";
import { useDashboardData } from "~/composables/useDashboardData";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("Analytics");

definePageMeta({ middleware: "auth" });
import { useUserStore } from "~/stores/user";

interface DateRange {
  preset: string;
  startDate: string;
  endDate: string;
}

const dashboardData = useDashboardData();
const activeFamily = useFamilyCtx();
const userStore = useUserStore();

const { allSchools, allOffers, schoolCount, interactionCount } = dashboardData;

// Scatter x-axis label sourced from the metric registry (not a baseball literal).
const performanceScatterXLabel = computed(() => {
  const def = getMetricDef("exit_velo");
  return def.unit ? `${def.label} (${def.unit})` : def.label;
});

const stats = computed(() => ({
  totalSchools: schoolCount.value,
  totalInteractions: interactionCount.value,
  totalOffers: allOffers.value.length,
  commitments: allSchools.value.filter((s) => s.status === "committed").length,
}));

const dateRange = ref<DateRange>({
  preset: "last_30_days",
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
});

// Chart Data
const chartData = ref({
  interactionTypes: [
    { label: "Email", value: 34 },
    { label: "Phone Call", value: 28 },
    { label: "In-Person Visit", value: 15 },
    { label: "Text", value: 10 },
  ],
  sentiments: [
    { label: "Positive", value: 52 },
    { label: "Neutral", value: 28 },
    { label: "Needs Follow-up", value: 7 },
  ],
  schoolStatus: [
    { label: "Active Recruiting", value: 18 },
    { label: "On Wait List", value: 4 },
    { label: "Passed", value: 2 },
  ],
  pipeline: [
    { label: "Initial Contact", value: 250, color: "#3b82f6" }, // audit-ignore — Chart.js config requires raw hex
    { label: "Active Discussions", value: 85, color: "#10b981" }, // audit-ignore — Chart.js config requires raw hex
    { label: "Offers Extended", value: 15, color: "#f59e0b" }, // audit-ignore — Chart.js config requires raw hex
    { label: "Committed", value: 3, color: "#ef4444" }, // audit-ignore — Chart.js config requires raw hex
  ],
  performanceData: [
    {
      label: "Performance Metrics",
      data: [
        { x: 85, y: 340, label: "Player A" },
        { x: 88, y: 355, label: "Player B" },
        { x: 82, y: 325, label: "Player C" },
        { x: 90, y: 365, label: "Player D" },
        { x: 87, y: 350, label: "Player E" },
        { x: 84, y: 335, label: "Player F" },
        { x: 86, y: 345, label: "Player G" },
        { x: 89, y: 360, label: "Player H" },
      ],
      color: "#3b82f6", // audit-ignore — Chart.js config requires raw hex
    },
  ],
});

const handleDateRangeChange = (newRange: DateRange) => {
  dateRange.value = newRange;
  // TODO: Fetch analytics data for new date range
};

const handleInteractionTypeClick = (
  label: string,
  value: number,
  index: number,
) => {
  logger.debug(`Clicked interaction type: ${label} (${value})`);
  // TODO: Navigate to detailed view or filter interactions
};

const handlePipelineStageClick = (
  label: string,
  value: number,
  index: number,
) => {
  logger.debug(`Clicked pipeline stage: ${label} (${value})`);
  // TODO: Show details or drill down into stage
};

const handleExport = (format: "csv" | "excel" | "pdf") => {
  logger.debug(`Exporting analytics as ${format}`);
  // TODO: Implement export functionality
};

onMounted(async () => {
  const familyId = activeFamily.activeFamilyId?.value;
  const userId = activeFamily.isViewingAsParent?.value
    ? (activeFamily.activeAthleteId?.value ?? userStore.user?.id)
    : userStore.user?.id;

  if (familyId && userId) {
    await dashboardData.fetchAll(familyId, userId);
  }
});
</script>
