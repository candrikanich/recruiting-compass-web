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
      class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition"
    >
      <div class="flex items-center gap-3">
        <div
          v-if="stat.icon"
          :class="getIconBgClass(stat.color)"
          class="w-10 h-10 rounded-lg flex items-center justify-center"
        >
          <component
            :is="stat.icon"
            :class="getIconClass(stat.color)"
            class="w-5 h-5"
            aria-hidden="true"
          />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-900">
            {{ stat.value }}
          </p>
          <p class="text-sm text-slate-500">
            {{ stat.label }}
          </p>
        </div>
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

const getIconBgClass = (color?: string): string => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100',
    amber: 'bg-amber-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    slate: 'bg-slate-100'
  };
  return colorMap[color || 'blue'] || 'bg-blue-100';
};
</script>
