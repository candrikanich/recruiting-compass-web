<!-- components/shared/StatsTiles.vue -->
<template>
  <div
    v-if="stats.length > 0"
    role="region"
    :aria-label="ariaLabel"
    class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
  >
    <div
      v-for="(stat, index) in stats"
      :key="index"
      :data-testid="stat.testId"
      class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition"
    >
      <div class="flex items-center justify-between mb-3">
        <component
          v-if="stat.icon"
          :is="stat.icon"
          :class="getIconClass(stat.color)"
          class="w-8 h-8"
          aria-hidden="true"
        />
      </div>
      <div class="text-3xl font-bold text-slate-900 mb-1">
        {{ stat.value }}
      </div>
      <div class="text-sm text-slate-600">
        {{ stat.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

interface StatTile {
  label: string;
  value: number | string;
  icon?: Component;
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'slate';
  testId?: string;
}

interface Props {
  stats: StatTile[];
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  ariaLabel: 'Statistics'
});

const getIconClass = (color?: string): string => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    slate: 'text-slate-600'
  };
  return colorMap[color || 'blue'] || 'text-blue-600';
};
</script>
