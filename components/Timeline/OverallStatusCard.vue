<template>
  <div
    v-if="!statusLoading"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
  >
    <!-- Header with Status Badge -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-slate-900 font-semibold">Overall Status</h3>
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg" :class="statusBadgeClass">
        <div class="w-2 h-2 rounded-full" :class="statusDotClass" />
        <span class="text-sm font-medium">{{ statusLabelDisplay }}</span>
      </div>
    </div>

    <!-- Status Score and Message -->
    <div class="mb-6 pb-6 border-b border-slate-200">
      <div class="mb-3">
        <div class="text-3xl font-bold text-slate-900">{{ statusScore }}<span class="text-xl text-slate-500">/100</span></div>
        <p class="text-sm text-slate-600 mt-1">{{ advice }}</p>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="space-y-4 mb-6">
      <!-- Task Progress -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-700">Task Progress</span>
          <span class="text-sm font-semibold text-slate-900">{{ taskCompletedCount }}/{{ taskTotalCount }} ({{ taskProgressPercent }}%)</span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            :style="{ width: `${taskProgressPercent}%` }"
          />
        </div>
      </div>

      <!-- School Tracking -->
      <div class="flex items-center justify-between pt-2">
        <span class="text-sm font-medium text-slate-700">Schools Tracked</span>
        <span class="text-sm font-semibold text-slate-900">{{ schoolCount }} {{ schoolCount === 1 ? 'school' : 'schools' }}</span>
      </div>
    </div>

    <!-- Strongest & Weakest Areas -->
    <div class="mb-6 pb-6 border-t border-slate-200 pt-6">
      <div class="grid grid-cols-2 gap-4">
        <!-- Strongest Areas -->
        <div v-if="strongestAreas.length > 0">
          <h4 class="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <span class="text-emerald-600">✓</span>
            Strengths
          </h4>
          <ul class="space-y-1">
            <li v-for="area in strongestAreas" :key="area" class="text-xs text-slate-600">
              {{ area }}
            </li>
          </ul>
        </div>

        <!-- Weakest Areas -->
        <div v-if="weakestAreas.length > 0">
          <h4 class="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <span class="text-amber-600">!</span>
            Focus Areas
          </h4>
          <ul class="space-y-1">
            <li v-for="area in weakestAreas" :key="area" class="text-xs text-slate-600">
              {{ area }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Action Items for Behind/At Risk -->
    <div v-if="showActionItems && nextActions.length > 0" class="bg-slate-50 rounded-lg p-4">
      <h4 class="text-sm font-semibold text-slate-900 mb-3">Next Steps</h4>
      <ul class="space-y-2">
        <li v-for="(action, idx) in nextActions" :key="idx" class="flex gap-2 text-sm text-slate-700">
          <span class="text-slate-400 flex-shrink-0">{{ idx + 1 }}.</span>
          <span>{{ action }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useStatusScore } from "~/composables/useStatusScore";
import { useTasks } from "~/composables/useTasks";
import { useSchools } from "~/composables/useSchools";
import { usePhaseCalculation } from "~/composables/usePhaseCalculation";

const { statusScore, statusLabel, loading: statusLoading, advice, weakestAreas, strongestAreas } = useStatusScore();
const { tasksWithStatus } = useTasks();
const { schools } = useSchools();
const { currentPhase } = usePhaseCalculation();

// Computed status label display
const statusLabelDisplay = computed(() => {
  const labels: Record<string, string> = {
    on_track: "On Track",
    slightly_behind: "Slightly Behind",
    at_risk: "At Risk",
  };
  return labels[statusLabel.value] || "Unknown";
});

// Status badge styling
const statusBadgeClass = computed(() => {
  switch (statusLabel.value) {
    case "on_track":
      return "bg-emerald-50 border border-emerald-200";
    case "slightly_behind":
      return "bg-amber-50 border border-amber-200";
    case "at_risk":
      return "bg-red-50 border border-red-200";
    default:
      return "bg-slate-50 border border-slate-200";
  }
});

// Status dot color
const statusDotClass = computed(() => {
  switch (statusLabel.value) {
    case "on_track":
      return "bg-emerald-500";
    case "slightly_behind":
      return "bg-amber-500";
    case "at_risk":
      return "bg-red-500";
    default:
      return "bg-slate-300";
  }
});

// Task metrics
const taskTotalCount = computed(() => tasksWithStatus.value.length);
const taskCompletedCount = computed(
  () => tasksWithStatus.value.filter((t) => t.athlete_task?.status === "completed").length
);
const taskProgressPercent = computed(() => {
  if (taskTotalCount.value === 0) return 0;
  return Math.round((taskCompletedCount.value / taskTotalCount.value) * 100);
});

// School count
const schoolCount = computed(() => schools.value.length);

// Show action items only for Below or At Risk statuses
const showActionItems = computed(
  () => statusLabel.value === "slightly_behind" || statusLabel.value === "at_risk"
);

// Get next actions based on phase
const nextActions = computed(() => {
  const { getNextActions } = useStatusScore();
  return getNextActions(currentPhase.value).slice(0, 3);
});
</script>
