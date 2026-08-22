<template>
  <div class="grid grid-cols-3 gap-3 mb-6">
    <!-- Overall Score -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3">
      <div class="flex items-center gap-1.5 mb-1.5">
        <svg
          class="w-4 h-4 shrink-0"
          :class="statusTextClass"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12a9 9 0 1018 0 9 9 0 00-18 0zm9 0l3-3"
          />
        </svg>
        <span class="text-xs text-slate-500">Status</span>
      </div>
      <div class="text-lg font-bold text-slate-900 mb-1.5">
        {{ statusScore }}<span class="text-sm font-semibold text-slate-400"
          >/100</span
        >
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          data-testid="status-dot"
          class="h-full transition-all duration-300"
          :class="statusBarClass"
          :style="{ width: `${statusScore}%` }"
        />
      </div>
    </div>

    <!-- Task Progress -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3">
      <div class="flex items-center gap-1.5 mb-1.5">
        <svg
          class="w-4 h-4 shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span class="text-xs text-slate-500">Tasks</span>
      </div>
      <div class="text-lg font-bold text-slate-900 mb-1.5">
        {{ taskCompleted }}/{{ taskTotal }}
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          data-testid="task-bar"
          class="h-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${taskPercent}%` }"
        />
      </div>
    </div>

    <!-- Milestone Progress -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3">
      <div class="flex items-center gap-1.5 mb-1.5">
        <svg
          class="w-4 h-4 shrink-0 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 21V5a2 2 0 012-2h11l-2 4 2 4H5"
          />
        </svg>
        <span class="text-xs text-slate-500">Milestones</span>
      </div>
      <div class="text-lg font-bold text-slate-900 mb-1.5">
        {{ milestonesCompleted }}/{{ milestonesTotal }}
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-amber-500 transition-all duration-300"
          :style="{ width: `${milestonePercent}%` }"
        />
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

const statusTextClass = computed(() => {
  const colors: Record<StatusLabel, string> = {
    on_track: "text-emerald-500",
    slightly_behind: "text-amber-500",
    at_risk: "text-red-500",
  };
  return colors[props.statusLabel];
});

const statusBarClass = computed(() => {
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

const milestonePercent = computed(() => {
  if (props.milestonesTotal === 0) return 0;
  return Math.round((props.milestonesCompleted / props.milestonesTotal) * 100);
});
</script>
