<template>
  <div class="flex items-start gap-3">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-slate-700">{{ signal.label }}</span>
        <span
          class="px-1.5 py-0.5 rounded text-xs font-semibold"
          :class="chipClass"
        >
          {{ chipLabel }}
        </span>
      </div>
      <p v-if="signal.value" class="text-xs text-slate-500 mt-0.5">
        {{ signal.value }}
      </p>
      <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">
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
