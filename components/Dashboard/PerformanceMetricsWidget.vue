<template>
  <div
    v-if="showPerformance"
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="mb-5 flex items-center gap-3">
      <div class="rounded-lg bg-slate-100 p-2">
        <UIcon name="i-heroicons-chart-bar" class="h-5 w-5 text-slate-700" />
      </div>
      <h3 class="font-semibold text-slate-900">Performance Metrics</h3>
    </div>

    <!-- With Metrics -->
    <div v-if="metrics.length > 0" class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="metric in topMetrics"
          :key="metric.id"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center"
        >
          <div class="mb-1 text-sm text-slate-600">
            {{ metric.metric_type }}
          </div>
          <div
            class="text-xl font-bold"
            :class="getMetricColor(metric.metric_type)"
          >
            {{ formatMetricValue(metric.metric_type, metric.value) }}
            <span v-if="metric.unit" class="ml-1 text-sm text-slate-500">{{
              metric.unit
            }}</span>
          </div>
        </div>
      </div>
      <NuxtLink
        to="/performance"
        class="mt-4 block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700"
      >
        View All Metrics →
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="py-8 text-center">
      <p class="mb-4 text-slate-600">No performance metrics logged yet</p>
      <NuxtLink
        to="/performance"
        class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
      >
        Log Your First Metric →
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMetricValue } from "~/utils/metricFormat";
interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit?: string;
  [key: string]: any;
}

interface Props {
  metrics: Metric[];
  topMetrics?: Metric[];
  showPerformance?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  topMetrics: () => [],
  showPerformance: true,
});

const getMetricColor = (type: string): string => {
  const colors: Record<string, string> = {
    height: "text-blue-600",
    weight: "text-emerald-600",
    velocity: "text-orange-600",
    exit_velo: "text-purple-600",
  };
  return colors[type.toLowerCase()] || "text-slate-600";
};
</script>
