<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md"
        >
          <span class="text-lg" aria-hidden="true">🎯</span>
        </div>
        <h3
          id="school-pipeline-chart-title"
          class="text-slate-900 font-semibold"
        >
          School Pipeline
        </h3>
        <!-- Data summary for screen readers -->
        <div
          class="sr-only"
          role="region"
          aria-labelledby="school-pipeline-chart-title"
          aria-live="polite"
        >
          {{ chartDataSummary }}
        </div>
      </div>
      <div class="text-sm text-slate-600" aria-label="Total schools count">
        Total: {{ totalSchools }}
      </div>
    </div>

    <div v-if="chartData" class="relative h-64">
      <canvas
        ref="chartCanvas"
        role="img"
        aria-labelledby="school-pipeline-chart-title"
        aria-describedby="school-pipeline-chart-description"
      ></canvas>
      <!-- Hidden text description of chart -->
      <p id="school-pipeline-chart-description" class="sr-only">
        {{ chartDataSummary }}
      </p>
      <!-- Accessible data table as text alternative -->
      <table id="school-pipeline-data-table" class="sr-only">
        <caption>
          School Pipeline - Detailed Data
        </caption>
        <thead>
          <tr>
            <th>Status</th>
            <th>Number of Schools</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in chartDataTable" :key="index">
            <td>{{ row.label }}</td>
            <td>{{ row.value }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="h-64 flex flex-col items-center justify-center rounded-lg bg-slate-50 text-slate-600"
    >
      <BuildingLibraryIcon class="w-12 h-12 mb-3 text-slate-400" />
      <p class="text-sm font-medium">No schools added yet</p>
      <p class="text-xs text-slate-500 mt-1">
        Add schools to track your recruiting pipeline
      </p>
      <NuxtLink
        to="/schools/new"
        class="mt-4 px-4 py-2 bg-brand-blue-500 text-white text-sm rounded-lg hover:bg-brand-blue-600 transition-colors"
      >
        Add School
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { BuildingLibraryIcon } from "@heroicons/vue/24/outline";
import type { School } from "~/types/models";

interface Props {
  schools: School[];
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartJS<"bar"> | null = null;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const totalSchools = computed(() => props.schools.length);

const chartData = computed(() => {
  if (props.schools.length === 0) return null;

  const statusCounts: Record<string, number> = {
    researching: 0,
    contacted: 0,
    interested: 0,
    offer_received: 0,
    committed: 0,
  };

  props.schools.forEach((school) => {
    const status = school.status || "researching";
    if (status in statusCounts) {
      statusCounts[status]++;
    }
  });

  const labels = [
    "Researching",
    "Contacted",
    "Interested",
    "Offer Received",
    "Committed",
  ];
  const data = [
    statusCounts.researching,
    statusCounts.contacted,
    statusCounts.interested,
    statusCounts.offer_received,
    statusCounts.committed,
  ];
  // Map to design token colors (will be resolved at mount time)
  const colors = [
    "researching",
    "contacted",
    "interested",
    "offer_received",
    "committed",
  ];

  return { labels, data, colors };
});

// Chart data summary for screen readers
const chartDataSummary = computed(() => {
  if (!chartData.value) return "No chart data available";

  const total = chartData.value.data.reduce((sum, val) => sum + val, 0);
  const statusDescriptions = chartData.value.labels.map(
    (label, idx) => `${label}: ${chartData.value!.data[idx]} schools`,
  );

  return `Bar chart showing ${total} total schools across recruitment pipeline. ${statusDescriptions.join(", ")}.`;
});

// Chart data table for screen readers
const chartDataTable = computed(() => {
  if (!chartData.value) return [];
  return chartData.value.labels.map((label, idx) => ({
    label,
    value: chartData.value!.data[idx],
  }));
});

const initializeChart = () => {
  if (!chartCanvas.value || !chartData.value) {
    return;
  }

  // Destroy existing chart instance if it exists
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Resolve design token colors to actual values
  const root = document.documentElement;
  const mutedForeground =
    getComputedStyle(root).getPropertyValue("--muted-foreground").trim() ||
    "#666";

  const statusColorMap: Record<string, string> = {
    researching:
      getComputedStyle(root).getPropertyValue("--muted").trim() || "#ececf0",
    contacted:
      getComputedStyle(root).getPropertyValue("--brand-blue-500").trim() ||
      "#3b82f6",
    interested:
      getComputedStyle(root).getPropertyValue("--brand-emerald-500").trim() ||
      "#10b981",
    offer_received:
      getComputedStyle(root).getPropertyValue("--brand-orange-500").trim() ||
      "#f97316",
    committed:
      getComputedStyle(root).getPropertyValue("--brand-emerald-600").trim() ||
      "#059669",
  };

  const resolvedColors = chartData.value.colors.map(
    (colorKey: string) => statusColorMap[colorKey] || "#999",
  );

  chartInstance = new ChartJS(chartCanvas.value, {
    type: "bar",
    data: {
      labels: chartData.value.labels,
      datasets: [
        {
          label: "Schools",
          data: chartData.value.data,
          backgroundColor: resolvedColors,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 14, weight: "bold" },
          bodyFont: { size: 13 },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 12 }, color: mutedForeground },
          grid: { color: "rgba(0, 0, 0, 0.05)" },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12 }, color: mutedForeground },
        },
      },
    },
  });
};

onMounted(() => {
  initializeChart();
});

watch(chartData, () => {
  initializeChart();
});
</script>
