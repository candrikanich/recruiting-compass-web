<template>
  <section aria-labelledby="coach-stats-heading">
    <h2 id="coach-stats-heading" class="sr-only">Coach Statistics</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Total Interactions -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3
          id="stat-interactions"
          class="text-sm text-slate-500 mb-1 font-medium"
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
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3
          id="stat-days-since-contact"
          class="text-sm text-slate-500 mb-1 font-medium"
        >
          Days Since Contact
        </h3>
        <p
          class="text-3xl font-bold"
          :class="daysSinceContactColor"
          aria-labelledby="stat-days-since-contact"
        >
          {{ stats.daysSinceContact }}
        </p>
      </div>

      <!-- Preferred Response Method -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3
          id="stat-response-method"
          class="text-sm text-slate-500 mb-1 font-medium"
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
</script>
