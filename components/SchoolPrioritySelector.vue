<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-slate-600 font-medium">Priority:</span>
    <div class="flex gap-1">
      <button
        v-for="tier in tiers"
        :key="tier"
        @click="selectTier(tier)"
        :data-testid="`priority-tier-${tier.toLowerCase()}`"
        :title="getTierTooltip(tier)"
        :aria-label="`Set priority to ${getTierTooltip(tier)}`"
        :class="[
          'px-2 py-1 rounded-full font-medium text-xs transition-all',
          modelValue === tier
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
        ]"
      >
        {{ tier }}
      </button>
      <button
        v-if="modelValue"
        @click="clearTier"
        data-testid="priority-tier-clear"
        class="px-2 py-1 rounded-full font-medium text-xs transition-all bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700"
        title="Clear priority tier"
        aria-label="Clear priority tier"
      >
        ✕
      </button>
    </div>
    <span v-if="modelValue" class="text-xs text-slate-600 font-medium">
      {{ tierLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  modelValue: "A" | "B" | "C" | null;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
});

const emit = defineEmits<{
  "update:modelValue": ["A" | "B" | "C" | null];
}>();

const tiers: Array<"A" | "B" | "C"> = ["A", "B", "C"];

const tierLabels: Record<"A" | "B" | "C", string> = {
  A: "Top Choice",
  B: "Strong Interest",
  C: "Fallback",
};

const tierLabel = computed(() => {
  return tierLabels[props.modelValue as "A" | "B" | "C"];
});

const getTierTooltip = (tier: "A" | "B" | "C"): string => {
  return tierLabels[tier];
};

const selectTier = (tier: "A" | "B" | "C") => {
  emit("update:modelValue", props.modelValue === tier ? null : tier);
};

const clearTier = () => {
  emit("update:modelValue", null);
};
</script>
