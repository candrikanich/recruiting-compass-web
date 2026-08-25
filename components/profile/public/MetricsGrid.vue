<!-- components/profile/public/MetricsGrid.vue -->
<script setup lang="ts">
import type { PublicMetric } from "~/types/models";

defineProps<{ metrics: PublicMetric[] }>();
</script>

<template>
  <section
    v-if="metrics.length"
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
  >
    <DSCard v-for="metric in metrics" :key="metric.key" padding="md">
      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-bold text-brand-slate-900">{{
          metric.value
        }}</span>
        <span v-if="metric.unit" class="text-sm text-brand-slate-500">{{
          metric.unit
        }}</span>
      </div>
      <div class="mt-1 flex items-center gap-1.5">
        <p class="text-xs text-brand-slate-500">{{ metric.label }}</p>
        <svg
          v-if="metric.verified"
          class="h-3.5 w-3.5 shrink-0 text-brand-emerald-600"
          fill="currentColor"
          viewBox="0 0 20 20"
          role="img"
          aria-label="Verified"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </DSCard>
  </section>
</template>
