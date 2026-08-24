<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <h3 class="mb-4 text-lg font-semibold text-slate-900">
      Communication Analytics
    </h3>

    <!-- Empty State -->
    <div v-if="metrics.totalInteractions === 0" class="py-6 text-center">
      <p class="text-slate-600">
        No analytics yet — log an interaction to start.
      </p>
    </div>

    <template v-else>
      <!-- Metrics table -->
      <dl class="divide-y divide-slate-100 rounded-lg border border-slate-200">
        <div
          v-for="row in rows"
          :key="row.label"
          class="flex items-center justify-between px-4 py-2.5"
        >
          <dt class="text-sm text-slate-600">{{ row.label }}</dt>
          <dd class="text-sm font-semibold text-slate-900">{{ row.value }}</dd>
        </div>
      </dl>

      <!-- Cross-coach ranking (only meaningful with 2+ coaches) -->
      <div
        v-if="comparison && comparison.totalCoaches >= 2"
        class="mt-4 flex flex-wrap items-center gap-2 text-sm"
      >
        <span class="text-slate-700">
          Ranks
          <span class="font-semibold text-blue-600"
            >#{{ comparison.rank }}</span
          >
          of {{ comparison.totalCoaches }} coaches by response rate
        </span>
        <span
          :class="[
            'rounded-sm px-2 py-0.5 text-xs font-medium',
            comparison.coach.responseRate >=
            comparison.schoolAverage.responseRate
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800',
          ]"
        >
          {{
            comparison.coach.responseRate >=
            comparison.schoolAverage.responseRate
              ? "Above"
              : "Below"
          }}
          school avg ({{ comparison.schoolAverage.responseRate }}%)
        </span>
      </div>

      <!-- Insights -->
      <ul v-if="insights.length > 0" class="mt-4 space-y-2">
        <li
          v-for="(insight, idx) in insights"
          :key="idx"
          class="flex items-start gap-2 rounded-sm bg-blue-50 p-2.5 text-sm text-blue-900"
        >
          <span aria-hidden="true">💡</span>
          <span>{{ insight }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  CoachMetrics,
  CoachComparison,
} from "~/composables/useCoachAnalytics";

const props = defineProps<{
  metrics: CoachMetrics;
  comparison: CoachComparison | null;
  insights: string[];
}>();

// Total interactions, days-since-contact, and preferred method already live in
// CoachStatsGrid above — the panel only carries the non-duplicated analytics.
const rows = computed(() => [
  {
    label: "Sent / received",
    value: `${props.metrics.outboundCount} / ${props.metrics.inboundCount}`,
  },
  { label: "Response rate", value: `${props.metrics.responseRate}%` },
  {
    label: "Avg response time",
    value:
      props.metrics.averageResponseTime > 0
        ? `${props.metrics.averageResponseTime}h`
        : "—",
  },
]);
</script>
