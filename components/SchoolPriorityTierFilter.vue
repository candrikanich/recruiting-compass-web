<template>
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2">
      Priority Tier
    </label>
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="tier in tiers"
        :key="tier"
        @click="toggleTier(tier)"
        :data-testid="`priority-filter-${tier}`"
        :class="[
          'px-3 py-2 rounded-lg text-sm font-medium transition-all border',
          isSelected(tier)
            ? tierSelectedClass(tier)
            : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100',
        ]"
      >
        {{ tier }} - {{ tierLabel(tier) }}
      </button>
      <button
        v-if="hasSelection"
        @click="clearTiers"
        data-testid="priority-filter-clear"
        class="px-3 py-2 rounded-lg text-sm font-medium transition-all border border-slate-300 bg-slate-50 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  modelValue: ("A" | "B" | "C")[] | null;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
});

const emit = defineEmits<{
  "update:modelValue": [("A" | "B" | "C")[] | null];
}>();

const tiers: Array<"A" | "B" | "C"> = ["A", "B", "C"];

const tierLabels: Record<"A" | "B" | "C", string> = {
  A: "Top Choice",
  B: "Strong Interest",
  C: "Fallback",
};

const tierColors: Record<"A" | "B" | "C", string> = {
  A: "border-red-300 bg-red-100 text-red-700 hover:bg-red-200",
  B: "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200",
  C: "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200",
};

const hasSelection = computed(() => {
  return props.modelValue && props.modelValue.length > 0;
});

const isSelected = (tier: "A" | "B" | "C") => {
  return (
    props.modelValue &&
    props.modelValue.length > 0 &&
    props.modelValue.includes(tier)
  );
};

const tierLabel = (tier: "A" | "B" | "C") => {
  return tierLabels[tier];
};

const tierSelectedClass = (tier: "A" | "B" | "C") => {
  return tierColors[tier];
};

const toggleTier = (tier: "A" | "B" | "C") => {
  const current = props.modelValue || [];
  const newSelection = isSelected(tier)
    ? current.filter((t) => t !== tier)
    : [...current, tier];

  emit("update:modelValue", newSelection.length > 0 ? newSelection : null);
};

const clearTiers = () => {
  emit("update:modelValue", null);
};
</script>
