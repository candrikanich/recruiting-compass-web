<template>
  <div class="space-y-8">
    <!-- Summary Statistics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        class="rounded-lg p-6 border bg-linear-to-br from-blue-100 to-blue-50 border-blue-200"
      >
        <p class="text-sm font-semibold uppercase text-slate-600">
          Total Metrics
        </p>
        <p class="text-3xl font-bold mt-2 text-slate-900">
          {{ metrics.length }}
        </p>
        <p class="text-xs mt-1 text-slate-600">across all categories</p>
      </div>

      <div
        class="rounded-lg p-6 border bg-linear-to-br from-emerald-100 to-emerald-50 border-emerald-200"
      >
        <p class="text-sm font-semibold uppercase text-slate-600">
          Latest Record
        </p>
        <p class="text-3xl font-bold mt-2 text-emerald-600">
          {{ latestValue }}
        </p>
        <p class="text-xs mt-1 text-slate-600">{{ formatDate(latestDate) }}</p>
      </div>

      <div
        class="rounded-lg p-6 border bg-linear-to-br from-purple-100 to-purple-50 border-purple-200"
      >
        <p class="text-sm font-semibold uppercase text-slate-600">
          Metric Types
        </p>
        <p class="text-3xl font-bold mt-2 text-purple-600">
          {{ metricTypes.length }}
        </p>
        <p class="text-xs mt-1 text-slate-600">being tracked</p>
      </div>

      <div
        class="rounded-lg p-6 border bg-linear-to-br from-orange-100 to-orange-50 border-orange-200"
      >
        <p class="text-sm font-semibold uppercase text-slate-600">
          Overall Trend
        </p>
        <p class="text-3xl font-bold mt-2" :class="getTrendColorClass()">
          {{ overallTrend }}
        </p>
        <p class="text-xs mt-1 text-slate-600">
          {{ trendIcon() }} {{ trendText() }}
        </p>
      </div>
    </div>

    <!-- Metric Summary (registry-driven, sport-agnostic) -->
    <div v-if="summaryMetricTypes.length > 0" class="rounded-lg shadow-sm p-6 bg-white">
      <h3 class="text-lg font-semibold mb-4 text-slate-900">Metric Summary</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        <MetricSummaryRow
          v-for="type in summaryMetricTypes"
          :key="type"
          :label="getMetricLabel(type)"
          :value="getMetricStats(type)"
          :unit="getUnit(type)"
        />
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="rounded-lg shadow-sm p-6 bg-white">
      <h3 class="text-lg font-semibold mb-4 text-slate-900">Recent Metrics</h3>
      <div v-if="recentMetrics.length > 0" class="space-y-2">
        <div
          v-for="metric in recentMetrics.slice(0, 5)"
          :key="metric.id"
          class="flex items-center justify-between py-2 px-3 rounded-sm bg-slate-50"
        >
          <div>
            <p class="font-medium text-slate-900">
              {{ getMetricLabel(metric.metric_type) }}
            </p>
            <p class="text-xs text-slate-600">
              {{ formatDate(metric.recorded_date) }}
            </p>
          </div>
          <p class="text-lg font-semibold text-slate-900">
            {{ formatMetricValue(metric.metric_type, metric.value) }}
            <span class="text-xs text-slate-600">{{
              getUnit(metric.metric_type)
            }}</span>
          </p>
        </div>
      </div>
      <div v-else class="text-center py-6">
        <p class="text-slate-600">No metrics recorded yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatMetricValue } from "~/utils/metricFormat";
import {
  metricTypesForSport,
  getMetricDef,
  OTHER_KEY,
} from "~/utils/metrics/canonical";
import { usePerformanceAnalytics } from "~/composables/usePerformanceAnalytics";
import type { Performance } from "~/types/models";
import MetricSummaryRow from "./MetricSummaryRow.vue";

interface Props {
  metrics: any[];
  /** Athlete's primary sport — drives the registry-backed metric summary.
   *  Null/undefined falls back to the baseball vocabulary (no regression). */
  primarySport?: string | null;
}

const props = defineProps<Props>();
const analytics = usePerformanceAnalytics();

const latestValue = computed(() => {
  if (props.metrics.length === 0) return "—";
  const sorted = [...props.metrics].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
  return sorted[0]?.value || "—";
});

const latestDate = computed(() => {
  if (props.metrics.length === 0) return new Date().toISOString();
  const sorted = [...props.metrics].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
  return sorted[0]?.recorded_date || new Date().toISOString();
});

const metricTypes = computed(() => {
  const types = new Set(props.metrics.map((m) => m.metric_type));
  return Array.from(types);
});

const overallTrend = computed(() => {
  if (props.metrics.length < 2) return "—";
  const trend = analytics.calculateTrend(
    props.metrics as Performance[],
    "value",
  );
  return trend.charAt(0).toUpperCase() + trend.slice(1);
});

const recentMetrics = computed(() => {
  return [...props.metrics].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
});

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getMetricStats = (type: string) => {
  const typeMetrics = props.metrics.filter((m) => m.metric_type === type);
  if (typeMetrics.length === 0) return "—";

  const latest = typeMetrics[typeMetrics.length - 1]?.value || 0;
  return formatMetricValue(type, latest);
};

const getMetricLabel = (type: string): string => getMetricDef(type).label;

const getUnit = (type: string): string => getMetricDef(type).unit;

// Registry-driven metric summary for the athlete's sport: only the metric
// types they have actually recorded, ordered by the sport's registry ordering.
// No invented baseball categories — the registry has no category metadata, so
// we group generically (one row per recorded metric type).
const summaryMetricTypes = computed(() => {
  const recorded = new Set(props.metrics.map((m) => m.metric_type));
  const ordered = metricTypesForSport(props.primarySport).filter(
    (type) => type !== OTHER_KEY && recorded.has(type),
  );
  // Include any recorded custom/off-sport keys the registry ordering omits.
  const extras = Array.from(recorded).filter(
    (type) => type && !ordered.includes(type as string),
  ) as string[];
  return [...ordered, ...extras];
});

const getTrendColorClass = (): string => {
  const trend = overallTrend.value.toLowerCase();
  if (trend.includes("improving")) return "text-emerald-600";
  if (trend.includes("declining")) return "text-red-600";
  return "text-slate-900";
};

const trendIcon = () => {
  const trend = overallTrend.value.toLowerCase();
  if (trend.includes("improving")) return "📈";
  if (trend.includes("declining")) return "📉";
  return "➡️";
};

const trendText = () => {
  return overallTrend.value;
};
</script>
