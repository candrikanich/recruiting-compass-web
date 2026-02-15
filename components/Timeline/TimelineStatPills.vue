<template>
  <div class="grid grid-cols-3 gap-3 mb-6">
    <!-- Overall Score -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 mb-1">Status</div>
      <div class="flex items-center gap-2">
        <div
          data-testid="status-dot"
          class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :class="statusDotClass"
        />
        <span class="text-lg font-bold text-slate-900">{{ statusScore }}</span>
        <span class="text-sm text-slate-500">/100</span>
      </div>
    </div>

    <!-- Task Progress -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 mb-1">Tasks</div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-slate-900"
          >{{ taskCompleted }}/{{ taskTotal }}</span
        >
        <span class="text-sm text-slate-500">{{ taskPercent }}%</span>
      </div>
      <div class="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${taskPercent}%` }"
        />
      </div>
    </div>

    <!-- Milestone Progress -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 mb-1">Milestones</div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-slate-900"
          >{{ milestonesCompleted }}/{{ milestonesTotal }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StatusLabel } from "~/types/timeline";

interface Props {
  statusScore: number;
  statusLabel: StatusLabel;
  taskCompleted: number;
  taskTotal: number;
  milestonesCompleted: number;
  milestonesTotal: number;
}

const props = defineProps<Props>();

const statusDotClass = computed(() => {
  const colors: Record<StatusLabel, string> = {
    on_track: "bg-emerald-500",
    slightly_behind: "bg-amber-500",
    at_risk: "bg-red-500",
  };
  return colors[props.statusLabel];
});

const taskPercent = computed(() => {
  if (props.taskTotal === 0) return 0;
  return Math.round((props.taskCompleted / props.taskTotal) * 100);
});
</script>
