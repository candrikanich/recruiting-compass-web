<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <h3 class="text-lg font-semibold text-slate-900 mb-4">
      Communication Analytics
    </h3>

    <!-- Empty State -->
    <div v-if="metrics.totalInteractions === 0" class="text-center py-6">
      <p class="text-slate-600">No analytics yet — log an interaction to start.</p>
    </div>

    <template v-else>
      <!-- Metrics table -->
      <dl class="divide-y divide-slate-100 border border-slate-200 rounded-lg">
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
            'px-2 py-0.5 rounded-sm text-xs font-medium',
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
          class="flex items-start gap-2 p-2.5 bg-blue-50 rounded-sm text-sm text-blue-900"
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
import type { CoachMetrics, CoachComparison } from "~/composables/useCoachAnalytics";
import { formatType } from "~/utils/interactionFormatters";

const props = defineProps<{
  metrics: CoachMetrics;
  comparison: CoachComparison | null;
  insights: string[];
}>();

const rows = computed(() => [
  { label: "Total interactions", value: String(props.metrics.totalInteractions) },
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
  {
    label: "Days since contact",
    value:
      props.metrics.daysSinceContact >= 0
        ? String(props.metrics.daysSinceContact)
        : "N/A",
  },
  { label: "Preferred method", value: formatType(props.metrics.preferredMethod) },
]);
</script>
