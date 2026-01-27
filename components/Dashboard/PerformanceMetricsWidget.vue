<template>
  <div
    v-if="showPerformance"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <div class="flex items-center gap-3 mb-5">
      <div class="p-2 bg-slate-100 rounded-lg">
        <ChartBarIcon class="w-5 h-5 text-slate-700" />
      </div>
      <h3 class="text-slate-900 font-semibold">Performance Metrics</h3>
    </div>

    <!-- With Metrics -->
    <div v-if="metrics.length > 0" class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="metric in topMetrics"
          :key="metric.id"
          class="text-center p-4 bg-slate-50 rounded-lg border border-slate-200"
        >
          <div class="text-slate-600 text-sm mb-1">
            {{ metric.metric_type }}
          </div>
          <div
            class="text-xl font-bold"
            :class="getMetricColor(metric.metric_type)"
          >
            {{ metric.value }}
            <span v-if="metric.unit" class="text-slate-500 text-sm ml-1">{{
              metric.unit
            }}</span>
          </div>
        </div>
      </div>
      <NuxtLink
        to="/performance"
        class="mt-4 block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
      >
        View All Metrics →
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <p class="text-slate-600 mb-4">No performance metrics logged yet</p>
      <NuxtLink
        to="/performance"
        class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Log Your First Metric →
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartBarIcon } from "@heroicons/vue/24/outline";

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
