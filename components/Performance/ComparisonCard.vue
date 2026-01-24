<template>
  <div class="rounded-lg p-4 bg-white border border-slate-300">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-600">
      {{ label }}
    </p>
    <div class="mt-2 flex items-baseline gap-1">
      <p class="text-2xl font-bold" :class="getValueClass()">
        {{ formatValue(value) }}
      </p>
      <p class="text-xs text-slate-600">{{ unit }}</p>
    </div>
    <div v-if="isChange" class="mt-2 flex items-center gap-1">
      <span class="text-sm font-medium" :class="getTrendClass()">
        {{ getTrendIcon() }}
        {{ getTrendText() }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  value: number | string;
  unit?: string;
  isChange?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  unit: "",
  isChange: false,
});

const formatValue = (val: number | string): string => {
  if (typeof val === "string") return val;
  if (typeof val === "number" && !Number.isInteger(val)) {
    return val.toFixed(1);
  }
  return String(val);
};

const getValueClass = (): string => {
  if (!props.isChange) return "text-slate-900";
  const numValue =
    typeof props.value === "number"
      ? props.value
      : parseFloat(String(props.value));
  if (numValue > 0) return "text-emerald-600";
  if (numValue < 0) return "text-red-600";
  return "text-slate-900";
};

const getTrendClass = (): string => {
  const numValue =
    typeof props.value === "number"
      ? props.value
      : parseFloat(String(props.value));
  if (numValue > 0) return "text-emerald-600";
  if (numValue < 0) return "text-red-600";
  return "text-slate-600";
};

const getTrendIcon = (): string => {
  const numValue =
    typeof props.value === "number"
      ? props.value
      : parseFloat(String(props.value));
  if (numValue > 0) return "📈";
  if (numValue < 0) return "📉";
  return "➡️";
};

const getTrendText = (): string => {
  const numValue =
    typeof props.value === "number"
      ? props.value
      : parseFloat(String(props.value));
  if (numValue > 0) return "Improving";
  if (numValue < 0) return "Declining";
  return "Stable";
};
</script>
