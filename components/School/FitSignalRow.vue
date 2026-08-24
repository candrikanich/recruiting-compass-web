<template>
  <div class="flex items-start gap-3">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-slate-700">{{
          signal.label
        }}</span>
        <span
          class="rounded px-1.5 py-0.5 text-xs font-semibold"
          :class="chipClass"
        >
          {{ chipLabel }}
        </span>
      </div>
      <p v-if="signal.value" class="mt-0.5 text-xs text-slate-500">
        {{ signal.value }}
      </p>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-400">
        {{ signal.explanation }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface SignalLike {
  label: string;
  value?: string | number | null;
  strength: string;
  explanation: string;
}

const props = defineProps<{ signal: SignalLike }>();

const chipClass = computed(() => {
  switch (props.signal.strength) {
    case "strong":
    case "above":
    case "in-range":
      return "bg-emerald-100 text-emerald-700";
    case "good":
      return "bg-blue-100 text-blue-700";
    case "stretch":
    case "below":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-400";
  }
});

const chipLabel = computed(() => {
  switch (props.signal.strength) {
    case "strong":
      return "Strong";
    case "above":
      return "Above range";
    case "in-range":
      return "In range";
    case "good":
      return "Good";
    case "stretch":
      return "Stretch";
    case "below":
      return "Below range";
    default:
      return "No data";
  }
});
</script>
