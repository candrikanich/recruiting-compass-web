<script setup lang="ts">
import { computed } from "vue";
import { useProfileCompleteness } from "~/composables/useProfileCompleteness";

const { completeness } = useProfileCompleteness();

const progressBarColor = computed(() => {
  const pct = completeness.value;
  if (pct < 33) return "bg-red-500";
  if (pct < 66) return "bg-yellow-500";
  return "bg-green-500";
});

const progressBarWidth = computed(() => {
  return `${Math.min(completeness.value, 100)}%`;
});

const completenessLabel = computed(() => {
  const pct = completeness.value;
  if (pct < 25) return "Just getting started";
  if (pct < 50) return "Making progress";
  if (pct < 75) return "Almost there";
  return "Profile strong";
});
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Progress Bar and Text -->
    <div class="flex-1">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-slate-900">
          Profile {{ completeness }}% complete
        </span>
        <span class="text-xs text-slate-600">{{ completenessLabel }}</span>
      </div>
      <div
        role="progressbar"
        :aria-valuenow="completeness"
        aria-valuemin="0"
        aria-valuemax="100"
        class="w-full h-2 bg-slate-200 rounded-full overflow-hidden"
      >
        <div
          :class="progressBarColor"
          class="h-full transition-all duration-300"
          :style="{ width: progressBarWidth }"
        />
      </div>
    </div>
  </div>
</template>
