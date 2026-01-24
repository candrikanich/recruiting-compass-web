<template>
  <div class="rounded-lg shadow p-6 bg-white">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold text-slate-900">{{ title }}</h2>
        <p class="text-sm mt-1 text-slate-600">
          {{ metrics.length }} metrics recorded
        </p>
      </div>

      <!-- Metric Type Toggles -->
      <div class="flex flex-wrap gap-3">
        <label
          v-for="type in metricTypes"
          :key="type"
          class="flex items-center cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="visibleMetrics.includes(type)"
            @change="toggleMetric(type)"
            class="w-4 h-4 rounded accent-blue-600"
          />
          <span class="ml-2 text-sm font-medium text-slate-600">{{
            getMetricLabel(type)
          }}</span>
        </label>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div v-if="hasData" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <StatCard label="Average" :value="stats.average" :unit="getUnit()" />
      <StatCard label="Maximum" :value="stats.maximum" :unit="getUnit()" />
      <StatCard label="Minimum" :value="stats.minimum" :unit="getUnit()" />
      <StatCard label="Trend" :value="stats.trend" :trend="true" />
      <StatCard label="Change %" :value="stats.percentChange" :percent="true" />
    </div>

    <!-- Chart -->
    <div v-if="hasData" class="relative mb-6" style="height: 400px">
      <Line :data="chartData" :options="chartOptions" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="text-slate-600">
        No metrics recorded for the selected criteria
      </p>
    </div>

    <!-- Period Comparison (if enabled) -->
    <div
      v-if="hasData && showComparison"
      class="mt-6 pt-6 border-t border-slate-300"
    >
      <h3 class="text-lg font-semibold mb-4 text-slate-900">
        Period Comparison (30 days)
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ComparisonCard
          label="Current Period"
          :value="comparison.currentPeriod"
          :unit="getUnit()"
        />
        <ComparisonCard
          label="Previous Period"
          :value="comparison.previousPeriod"
          :unit="getUnit()"
        />
        <ComparisonCard
          label="Change"
          :value="comparison.change"
          :unit="getUnit()"
          :is-change="true"
        />
        <ComparisonCard
          label="Change %"
          :value="comparison.changePercent"
          :unit="'%'"
          :is-change="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { usePerformanceAnalytics } from "~/composables/usePerformanceAnalytics";
import type { Performance } from "~/types/models";
import StatCard from "./StatCard.vue";
import ComparisonCard from "./ComparisonCard.vue";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface Props {
  title: string;
  metrics: any[];
  metricTypes: string[];
  category: "power" | "speed" | "hitting" | "pitching";
  showComparison?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showComparison: true,
});

const visibleMetrics = ref<string[]>([...props.metricTypes]);
const analytics = usePerformanceAnalytics();

const hasData = computed(() => props.metrics.length > 0);

const toggleMetric = (type: string) => {
  const index = visibleMetrics.value.indexOf(type);
  if (index > -1) {
    visibleMetrics.value.splice(index, 1);
  } else {
    visibleMetrics.value.push(type);
  }
};

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

const getUnit = (): string => {
  switch (props.category) {
    case "power":
      return "mph";
    case "speed":
      return "sec";
    case "hitting":
      return "avg";
    case "pitching":
      return "val";
    default:
      return "val";
  }
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

// Get visible metrics filtered data
const visibleMetricsData = computed(() => {
  return props.metrics.filter((m) =>
    visibleMetrics.value.includes(m.metric_type),
  );
});

// Calculate statistics
const stats = computed(() => {
  if (visibleMetricsData.value.length === 0) {
    return {
      average: 0,
      maximum: 0,
      minimum: 0,
      trend: "stable",
      percentChange: 0,
    };
  }

  const avg = analytics.calculateAverage(
    visibleMetricsData.value as Performance[],
    "value",
  );
  const max = analytics.calculateMax(
    visibleMetricsData.value as Performance[],
    "value",
  );
  const min = analytics.calculateMin(
    visibleMetricsData.value as Performance[],
    "value",
  );
  const trend = analytics.calculateTrend(
    visibleMetricsData.value as Performance[],
    "value",
  );

  // Calculate percent change from first to last
  const sorted = [...visibleMetricsData.value].sort(
    (a, b) =>
      new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime(),
  );
  const firstValue = sorted[0]?.value || 0;
  const lastValue = sorted[sorted.length - 1]?.value || 0;
  const percentChange = analytics.calculatePercentChange(firstValue, lastValue);

  return {
    average: Math.round(avg * 10) / 10,
    maximum: max,
    minimum: min,
    trend,
    percentChange: Math.round(percentChange * 10) / 10,
  };
});

// Period comparison
const comparison = computed(() => {
  if (visibleMetricsData.value.length === 0) {
    return {
      currentPeriod: 0,
      previousPeriod: 0,
      change: 0,
      changePercent: 0,
    };
  }

  return analytics.comparePeriods(
    visibleMetricsData.value as Performance[],
    "value",
    30,
  );
});

// Prepare chart data
const chartData = computed(() => {
  const datasets = visibleMetrics.value.map((type) => {
    const metricsOfType = props.metrics
      .filter((m: any) => m.metric_type === type)
      .sort(
        (a: any, b: any) =>
          new Date(a.recorded_date).getTime() -
          new Date(b.recorded_date).getTime(),
      );

    return {
      label: getMetricLabel(type),
      data: metricsOfType.map((m: any) => ({
        x: new Date(m.recorded_date).getTime(),
        y: m.value,
      })),
      borderColor: getMetricColor(type),
      backgroundColor: getMetricColor(type) + "20",
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointBackgroundColor: getMetricColor(type),
      pointBorderColor: "#fff",
      pointHoverRadius: 8,
    };
  });

  return { datasets };
});

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  plugins: {
    tooltip: {
      callbacks: {
        title: (context: any) => {
          if (context.length === 0) return "";
          const date = new Date(context[0].label);
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        },
      },
    },
    legend: {
      display: true,
      position: "bottom" as const,
      labels: {
        padding: 15,
        usePointStyle: true,
        font: {
          size: 12,
        },
      },
    },
  },
  scales: {
    x: {
      type: "time" as const,
      time: {
        unit: "day" as const,
        displayFormats: {
          day: "MMM d",
        },
      },
      title: {
        display: true,
        text: "Date",
        font: {
          size: 12,
          weight: "bold" as const,
        },
      },
      grid: {
        display: true,
        color: "#f1f5f9",
      },
    },
    y: {
      title: {
        display: true,
        text: getYAxisLabel(),
        font: {
          size: 12,
          weight: "bold" as const,
        },
      },
      beginAtZero: false,
      grid: {
        color: "#f1f5f9",
      },
    },
  },
}));

const getYAxisLabel = (): string => {
  switch (props.category) {
    case "power":
      return "Velocity (mph)";
    case "speed":
      return "Time (seconds)";
    case "hitting":
      return "Batting Average";
    case "pitching":
      return "Value";
    default:
      return "Value";
  }
};
</script>
