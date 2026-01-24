<template>
  <div class="rounded-lg p-6 bg-white shadow-md">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4"
    >
      <div>
        <h3 class="text-lg font-bold text-slate-900">{{ title }}</h3>
        <p class="text-sm mt-1 text-slate-600">
          {{ totalItems }} {{ itemsLabel }}
        </p>
      </div>

      <!-- Legend/Type Toggle -->
      <div v-if="showLegendToggle" class="flex items-center gap-2">
        <button
          @click="chartType = chartType === 'pie' ? 'doughnut' : 'pie'"
          class="px-3 py-1 text-sm font-medium rounded-md transition border border-slate-300 text-slate-900 hover:bg-slate-50"
        >
          {{ chartType === "pie" ? "Pie" : "Doughnut" }}
        </button>
      </div>
    </div>

    <!-- Chart -->
    <div v-if="hasData" class="relative" :style="{ height: chartHeight }">
      <Pie :data="chartData" :options="chartOptions" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-600">
      <p>{{ emptyStateMessage }}</p>
    </div>

    <!-- Data Summary (Optional) -->
    <div
      v-if="hasData && showSummary"
      class="mt-6 pt-6 border-t border-slate-200"
    >
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="(item, index) in summaryItems"
          :key="index"
          class="text-center p-3 rounded-lg bg-slate-50"
          data-testid="summary-card"
        >
          <div
            class="inline-block w-3 h-3 rounded-full mb-2"
            :style="{
              backgroundColor: chartColors[index % chartColors.length],
            }"
          ></div>
          <p class="text-sm font-medium text-slate-900">{{ item.label }}</p>
          <p class="text-lg font-bold text-slate-900">{{ item.value }}</p>
          <p class="text-xs text-slate-600">{{ item.percentage }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Pie } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface DataItem {
  label: string;
  value: number;
}

interface Props {
  title: string;
  data: DataItem[];
  chartHeight?: string;
  showLegendToggle?: boolean;
  showSummary?: boolean;
  itemsLabel?: string;
  emptyStateMessage?: string;
  colors?: string[];
  onSegmentClick?: (label: string, value: number, index: number) => void;
}

const props = withDefaults(defineProps<Props>(), {
  chartHeight: "300px",
  showLegendToggle: false,
  showSummary: true,
  itemsLabel: "items",
  emptyStateMessage: "No data available",
  colors: () => [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#f97316", // orange
  ],
});

const emit = defineEmits<{
  "segment-click": [label: string, value: number, index: number];
}>();

const chartType = ref<"pie" | "doughnut">("pie");
const chartColors = computed(() => props.colors);

const hasData = computed(() => props.data.length > 0);
const totalItems = computed(() =>
  props.data.reduce((sum, item) => sum + item.value, 0),
);

const summaryItems = computed(() => {
  const total = totalItems.value;
  return props.data.map((item) => ({
    label: item.label,
    value: item.value,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));
});

const chartData = computed(() => ({
  labels: props.data.map((item) => item.label),
  datasets: [
    {
      label: props.title,
      data: props.data.map((item) => item.value),
      backgroundColor: chartColors.value.slice(0, props.data.length),
      borderColor: "#fff",
      borderWidth: 2,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        padding: 15,
        usePointStyle: true,
        font: {
          size: 12,
        },
        color: "#6b7280",
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || "";
          const value = context.parsed || 0;
          const total = totalItems.value;
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
  onClick: (_event: any, activeElements: any[]) => {
    if (activeElements.length > 0) {
      const index = activeElements[0].index;
      const item = props.data[index];
      emit("segment-click", item.label, item.value, index);
      props.onSegmentClick?.(item.label, item.value, index);
    }
  },
}));

// Expose computed properties for testing
defineExpose({
  chartData,
  chartOptions,
  summaryItems,
  hasData,
});
</script>
