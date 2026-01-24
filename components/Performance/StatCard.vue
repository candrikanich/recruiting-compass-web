<template>
  <div
    class="rounded-lg p-4 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200"
  >
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-600">
      {{ label }}
    </p>
    <div class="mt-2 flex items-baseline gap-1">
      <p v-if="trend" class="text-2xl font-bold capitalize text-slate-900">
        {{ value }}
      </p>
      <p
        v-else-if="percent"
        class="text-2xl font-bold"
        :style="getPercentStyle"
      >
        {{ formatValue(value) }}{{ unit }}
      </p>
      <p v-else class="text-2xl font-bold text-slate-900">
        {{ formatValue(value) }}
      </p>
      <p v-if="!trend" class="text-xs text-slate-600">{{ unit }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  trend?: boolean;
  percent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  unit: "",
  trend: false,
  percent: false,
});

const formatValue = (val: number | string): string => {
  if (typeof val === "string") return val;
  if (typeof val === "number" && !Number.isInteger(val)) {
    return val.toFixed(1);
  }
  return String(val);
};

const getPercentStyle = computed(() => {
  const numValue =
    typeof props.value === "number"
      ? props.value
      : parseFloat(String(props.value));
  if (numValue > 0) return "text-emerald-600";
  if (numValue < 0) return "text-red-600";
  return "text-slate-900";
});
</script>
