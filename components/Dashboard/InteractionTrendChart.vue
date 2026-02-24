<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md"
        >
          <span class="text-lg" aria-hidden="true">📈</span>
        </div>
        <h3 id="interaction-chart-title" class="text-slate-900 font-semibold">
          Interaction Trends (30 Days)
        </h3>
        <!-- Data summary for screen readers -->
        <div
          class="sr-only"
          role="region"
          aria-labelledby="interaction-chart-title"
          aria-live="polite"
        >
          {{ chartDataSummary }}
        </div>
      </div>
      <div class="text-sm text-slate-600" aria-label="Total interactions count">
        Total: {{ totalInteractions }}
      </div>
    </div>

    <div v-if="chartData" class="relative h-64">
      <canvas
        ref="chartCanvas"
        role="img"
        aria-labelledby="interaction-chart-title"
        aria-describedby="interaction-chart-description"
      ></canvas>
      <!-- Hidden text description of chart -->
      <p id="interaction-chart-description" class="sr-only">
        {{ chartDataSummary }}
      </p>
      <!-- Accessible data table as text alternative -->
      <table id="interaction-data-table" class="sr-only">
        <caption>
          Interaction Trends - Detailed Data
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Interactions</th>
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
      <ChatBubbleLeftRightIcon class="w-12 h-12 mb-3 text-slate-400" />
      <p class="text-sm font-medium">No interactions in the last 30 days</p>
      <p class="text-xs text-slate-500 mt-1">
        Log your first interaction to see trends here
      </p>
      <NuxtLink
        to="/interactions/new"
        class="mt-4 px-4 py-2 bg-brand-blue-500 text-white text-sm rounded-lg hover:bg-brand-blue-600 transition-colors"
      >
        Log Interaction
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
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { ChatBubbleLeftRightIcon } from "@heroicons/vue/24/outline";
import type { Interaction } from "~/types/models";

interface Props {
  interactions: Interaction[];
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartJS | null = null;

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const totalInteractions = computed(() => props.interactions.length);

const recentInteractionCount = computed(() => {
  if (props.interactions.length === 0) return 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return props.interactions.filter((interaction) => {
    const recordedDate = interaction.recorded_date || interaction.created_at;
    if (!recordedDate) return false;
    const date = new Date(recordedDate);
    return date >= thirtyDaysAgo;
  }).length;
});

const chartData = computed(() => {
  // Show empty state if no recent interactions
  if (recentInteractionCount.value === 0) return null;

  // Get last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Group interactions by date
  const dateGroups: Record<string, number> = {};

  props.interactions.forEach((interaction) => {
    const recordedDate = interaction.recorded_date || interaction.created_at;
    if (!recordedDate) return;

    const date = new Date(recordedDate);
    if (date >= thirtyDaysAgo) {
      const dateStr = date.toISOString().split("T")[0];
      dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    }
  });

  // Create labels for all 30 days
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    labels.push(
      new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );
    data.push(dateGroups[dateStr] || 0);
  }

  return { labels, data };
});

// Chart data summary for screen readers
const chartDataSummary = computed(() => {
  if (!chartData.value) return "No chart data available";

  const total = chartData.value.data.reduce((sum, val) => sum + val, 0);
  const max = Math.max(...chartData.value.data);
  const maxDate = chartData.value.labels[chartData.value.data.indexOf(max)];

  return `Chart showing ${total} total interactions over the last 30 days. Peak activity was ${max} interactions on ${maxDate}.`;
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
  try {
    if (!chartCanvas.value || !chartData.value) {
      return;
    }

    // Destroy existing chart instance if it exists
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    // Get computed colors from CSS variables
    const root = document.documentElement;
    const brandBlue600 =
      getComputedStyle(root).getPropertyValue("--brand-blue-600").trim() ||
      "#3b82f6";
    const mutedForeground =
      getComputedStyle(root).getPropertyValue("--muted-foreground").trim() ||
      "#666";

    chartInstance = new ChartJS(chartCanvas.value, {
      type: "line",
      data: {
        labels: chartData.value.labels,
        datasets: [
          {
            label: "Interactions",
            data: chartData.value.data,
            borderColor: brandBlue600,
            backgroundColor: `${brandBlue600}19`,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: brandBlue600,
            pointBorderColor: "white",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
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
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0, 0, 0, 0.05)" },
            ticks: { font: { size: 12 }, color: mutedForeground },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: mutedForeground,
              maxRotation: 45,
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("[InteractionTrendChart] Error:", error);
  }
};

onMounted(() => {
  initializeChart();
});

watch(
  chartData,
  (newData) => {
    if (chartInstance && newData) {
      // Update existing chart data instead of recreating
      chartInstance.data.labels = newData.labels;
      chartInstance.data.datasets[0].data = newData.data;
      chartInstance.update("none"); // Update without animation
    } else {
      // No existing chart - create new one (runs after v-if renders canvas)
      initializeChart();
    }
  },
  { flush: "post" },
);
</script>
