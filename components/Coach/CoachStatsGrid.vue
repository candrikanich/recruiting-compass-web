<template>
  <section aria-labelledby="coach-stats-heading">
    <h2 id="coach-stats-heading" class="sr-only">Coach Statistics</h2>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <!-- Total Interactions -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3
          id="stat-interactions"
          class="mb-1 text-sm font-medium text-slate-500"
        >
          Total Interactions
        </h3>
        <p
          class="text-3xl font-bold text-slate-900"
          aria-labelledby="stat-interactions"
        >
          {{ stats.totalInteractions }}
        </p>
      </div>

      <!-- Days Since Contact -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3
          id="stat-days-since-contact"
          class="mb-1 text-sm font-medium text-slate-500"
        >
          Days Since Contact
        </h3>
        <div>
          <p class="text-3xl font-bold" :class="daysSinceContactColor">
            {{ stats.daysSinceContact }}
          </p>
          <p class="mt-1 text-sm font-medium" :class="daysSinceContactColor">
            {{ statusLabel }}
          </p>
          <span class="sr-only">
            Last contact was {{ stats.daysSinceContact }} days ago. Contact
            status is {{ statusLabel.toLowerCase() }}.
          </span>
        </div>
      </div>

      <!-- Preferred Response Method -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3
          id="stat-response-method"
          class="mb-1 text-sm font-medium text-slate-500"
        >
          Response Method
        </h3>
        <p
          class="text-xl font-bold text-slate-900"
          aria-labelledby="stat-response-method"
        >
          {{ stats.preferredMethod }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CoachStats } from "~/composables/useCoachStats";

const props = defineProps<{
  stats: CoachStats;
}>();

const daysSinceContactColor = computed(() => {
  if (props.stats.daysSinceContact === 0) return "text-emerald-600";
  if (props.stats.daysSinceContact > 30) return "text-red-600";
  return "text-orange-500";
});

const statusLabel = computed(() => {
  if (props.stats.daysSinceContact === 0) return "Recent";
  if (props.stats.daysSinceContact > 30) return "Overdue";
  return "Follow-up Soon";
});
</script>
