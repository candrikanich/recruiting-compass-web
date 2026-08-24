<template>
  <div
    v-if="!phaseLoading"
    class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <!-- Phase Badge -->
      <div class="flex shrink-0 items-center gap-3">
        <div
          class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="phaseBadgeClass"
        >
          {{ phaseLabel }}
        </div>
      </div>

      <!-- Status Score -->
      <div class="flex shrink-0 items-center gap-2">
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :class="scoreDotClass"
        />
        <span class="text-lg font-bold text-slate-900 tabular-nums">
          {{ statusScore }}<span class="font-normal text-slate-400">/100</span>
        </span>
      </div>

      <!-- Top Priority -->
      <div v-if="topPriority" class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-slate-900">
          {{ topPriority.title }}
        </p>
        <p class="truncate text-xs text-slate-500">
          {{ topPriority.whyItMatters }}
        </p>
      </div>
      <div v-else class="min-w-0 flex-1">
        <p class="text-sm text-slate-500">No pending priorities</p>
      </div>

      <!-- Timeline Link -->
      <NuxtLink
        to="/timeline"
        class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
      >
        View timeline &rarr;
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { usePhaseCalculation } from "~/composables/usePhaseCalculation";
import { useStatusScore } from "~/composables/useStatusScore";
import { useTasks } from "~/composables/useTasks";
import {
  getWhatMattersNow,
  type WhatMattersItem,
} from "~/utils/whatMattersNow";
import type { Phase } from "~/types/timeline";

const {
  currentPhase,
  loading: phaseLoading,
  fetchPhase,
} = usePhaseCalculation();

const { statusScore, statusColor, fetchStatusScore } = useStatusScore();

const { fetchTasksWithStatus, tasksWithStatus } = useTasks();

const topPriority = ref<WhatMattersItem | null>(null);

const PHASE_LABELS: Record<Phase, string> = {
  freshman: "Freshman Year",
  sophomore: "Sophomore Year",
  junior: "Junior Year",
  senior: "Senior Year",
  committed: "Committed",
};

const phaseLabel = computed(() => PHASE_LABELS[currentPhase.value]);

const phaseBadgeClass = computed(() => {
  const classes: Record<Phase, string> = {
    freshman: "bg-emerald-100 text-emerald-800",
    sophomore: "bg-blue-100 text-blue-800",
    junior: "bg-purple-100 text-purple-800",
    senior: "bg-amber-100 text-amber-800",
    committed: "bg-green-100 text-green-800",
  };
  return classes[currentPhase.value];
});

const scoreDotClass = computed(() => {
  if (statusScore.value >= 70) return "bg-green-500";
  if (statusScore.value >= 50) return "bg-amber-500";
  return "bg-red-500";
});

onMounted(async () => {
  try {
    await Promise.all([
      fetchPhase(),
      fetchStatusScore(),
      fetchTasksWithStatus(),
    ]);

    const items = getWhatMattersNow({
      phase: currentPhase.value,
      tasksWithStatus: tasksWithStatus.value,
    });

    topPriority.value = items[0] ?? null;
  } catch {
    // Silently degrade — card simply hides via v-if on loading
  }
});
</script>
