<!-- components/profile/public/MetricsCredentials.vue -->
<script setup lang="ts">
import type { RecruitingCredentials } from "~/utils/profile/recruitingCredentials";

defineProps<{ credentials: RecruitingCredentials }>();
</script>

<template>
  <div
    v-if="credentials.ncaaId || credentials.services.length"
    class="mb-4 flex flex-wrap items-center gap-2"
  >
    <span
      v-if="credentials.ncaaId"
      class="inline-flex items-center rounded-full bg-brand-slate-200 px-2 py-0.5 font-mono text-xs font-medium text-brand-slate-900"
    >
      NCAA ID: {{ credentials.ncaaId }}
    </span>
    <a
      v-for="service in credentials.services"
      :key="service.key"
      :href="service.url"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 rounded-full bg-brand-blue-200 px-2 py-0.5 text-xs font-medium text-brand-blue-900 hover:bg-brand-blue-300"
    >
      {{ service.label }}
      <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3 w-3" />
    </a>
  </div>
</template>
