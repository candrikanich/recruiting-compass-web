<template>
  <div class="rounded-lg shadow p-6 bg-white">
    <h2 class="text-2xl font-bold mb-4 text-slate-900">
      Current Performance Snapshot
    </h2>
    <p class="text-sm mb-6 text-slate-600">
      Latest metrics recorded (updated as new data is added)
    </p>

    <div v-if="hasMetrics" class="relative" style="height: 500px">
      <Radar :data="radarData" :options="radarOptions" />
    </div>

    <div v-else class="text-center py-12">
      <p class="text-slate-600">
        Log at least one metric to see your performance snapshot
      </p>
    </div>

    <!-- Legend -->
    <div v-if="hasMetrics" class="mt-8 pt-6 border-t border-slate-300">
      <h3 class="text-sm font-semibold mb-4 text-slate-900">Latest Values</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="type in metricTypes"
          :key="type"
          v-show="latestMetrics[type]"
          class="text-sm"
        >
          <div class="text-slate-600">{{ getMetricLabel(type) }}</div>
          <div class="text-lg font-bold text-slate-900">
            {{ latestMetrics[type]?.value.toFixed(2) }}
            <span class="text-sm text-slate-600">{{
              latestMetrics[type]?.unit
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Radar } from "vue-chartjs";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { PerformanceMetric } from "~/types/models";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

interface Props {
  latestMetrics: Record<string, PerformanceMetric>;
}

const props = defineProps<Props>();

const metricTypes = [
  "velocity",
  "exit_velo",
  "sixty_time",
  "pop_time",
  "batting_avg",
  "era",
  "strikeouts",
  "other",
];

const hasMetrics = computed(() => Object.keys(props.latestMetrics).length > 0);

const getMetricLabel = (type: string): string => {
  const labels: Record<string, string> = {
    velocity: "Velocity",
    exit_velo: "Exit Velo",
    sixty_time: "60-Yard",
    pop_time: "Pop Time",
    batting_avg: "Batting Avg",
    era: "ERA",
    strikeouts: "Strikeouts",
    other: "Other",
  };
  return labels[type] || type;
};

const getMetricColor = (type: string): string => {
  const colors: Record<string, string> = {
    velocity: "#3b82f6",
    exit_velo: "#10b981",
    sixty_time: "#f59e0b",
    pop_time: "#ef4444",
    batting_avg: "#8b5cf6",
    era: "#ec4899",
    strikeouts: "#06b6d4",
    other: "#6b7280",
  };
  return colors[type] || "#6b7280";
};

// Prepare radar data
const radarData = computed(() => {
  const labels: string[] = [];
  const data: number[] = [];
  const backgroundColor: string[] = [];
  const borderColors: string[] = [];

  metricTypes.forEach((type) => {
    if (props.latestMetrics[type]) {
      labels.push(getMetricLabel(type));
      const value = props.latestMetrics[type].value;

      // Normalize to 0-100 for display (using value directly for simplicity)
      // In production, you'd normalize against personal min/max
      const normalizedValue = Math.min(100, Math.max(0, value * 10)); // scale for visibility

      data.push(normalizedValue);
      backgroundColor.push(getMetricColor(type) + "40"); // 40% opacity
      borderColors.push(getMetricColor(type));
    }
  });

  return {
    labels,
    datasets: [
      {
        label: "Current Performance",
        data,
        backgroundColor,
        borderColor: borderColors,
        borderWidth: 2,
        pointBackgroundColor: borderColors,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: borderColors,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
});

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      angleLines: {
        display: true,
        color: "#f1f5f9",
      },
      grid: {
        color: "#f1f5f9",
      },
      suggestedMin: 0,
      suggestedMax: 100,
      ticks: {
        stepSize: 25,
        font: {
          size: 11,
        },
      },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          return `${context.label}: ${context.parsed.r.toFixed(1)}`;
        },
      },
    },
  },
};
</script>
