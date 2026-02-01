<template>
  <div class="flex items-center gap-2">
    <div class="flex gap-1">
      <button
        v-for="tier in tiers"
        :key="tier"
        @click="selectTier(tier)"
        :data-testid="`priority-tier-${tier.toLowerCase()}`"
        :class="[
          'px-3 py-2 rounded-md font-semibold text-sm transition-all',
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
        class="px-3 py-2 rounded-md font-semibold text-sm transition-all bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700"
        title="Clear priority tier"
      >
        ✕
      </button>
    </div>
    <span v-if="modelValue" class="text-sm text-gray-600">
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

const tierLabel = computed(() => {
  const labels: Record<"A" | "B" | "C", string> = {
    A: "Top Choice",
    B: "Strong Interest",
    C: "Fallback",
  };
  return labels[props.modelValue as "A" | "B" | "C"];
});

const selectTier = (tier: "A" | "B" | "C") => {
  emit("update:modelValue", props.modelValue === tier ? null : tier);
};

const clearTier = () => {
  emit("update:modelValue", null);
};
</script>
