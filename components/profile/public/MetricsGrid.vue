<!-- components/profile/public/MetricsGrid.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PublicMetric, PublicProfileData } from "~/types/models";
import { buildRecruitingCredentials } from "~/utils/profile/recruitingCredentials";
import MetricsCredentials from "~/components/profile/public/MetricsCredentials.vue";
import SectionHeader from "~/components/profile/public/SectionHeader.vue";

const props = withDefaults(
  defineProps<{
    metrics: PublicMetric[];
    athletic?: PublicProfileData["athletic"];
    playerName?: string | null;
  }>(),
  { athletic: null, playerName: null },
);

const credentials = computed(() =>
  buildRecruitingCredentials(props.athletic, props.playerName),
);
</script>

<template>
  <section v-if="metrics.length">
    <SectionHeader
      icon="i-heroicons-chart-bar"
      title="Verified Athletic Metrics"
    />
    <MetricsCredentials :credentials="credentials" />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <DesignSystemCard v-for="metric in metrics" :key="metric.key" padding="md">
        <p class="text-xs font-medium text-brand-slate-500">
          {{ metric.label }}
        </p>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-3xl font-bold text-brand-slate-900">{{
            metric.value
          }}</span>
          <span v-if="metric.unit" class="text-sm text-brand-slate-500">{{
            metric.unit
          }}</span>
        </div>
      </DesignSystemCard>
    </div>
  </section>
</template>
