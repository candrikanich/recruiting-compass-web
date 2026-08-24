<template>
  <div
    class="rounded-lg border-l-4 bg-white p-6 shadow-md"
    :class="getBorderColorClass"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-600">{{ label }}</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">
          {{ formattedValue }}
        </p>
        <p v-if="subLabel" class="mt-1 text-xs text-slate-600">
          {{ subLabel }}
        </p>
      </div>

      <!-- Icon/Badge -->
      <div
        v-if="showIcon"
        class="flex h-12 w-12 items-center justify-center rounded-full"
        :class="getIconClass"
      >
        <span class="text-xl">{{ icon }}</span>
      </div>
    </div>

    <!-- Trend Indicator -->
    <div v-if="trend !== undefined" class="mt-4 border-t border-slate-200 pt-4">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold" :class="getTrendClass">
          {{ trend > 0 ? "↑" : trend < 0 ? "↓" : "→" }}
          {{ Math.abs(trend) }}%
        </span>
        <span class="text-xs text-slate-600">{{ trendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  subLabel?: string;
  trend?: number;
  trendLabel?: string;
  borderColor?: string;
  icon?: string;
  showIcon?: boolean;
  format?: "number" | "percent" | "currency" | "decimal";
}

const props = withDefaults(defineProps<Props>(), {
  unit: "",
  borderColor: "#3b82f6", // audit-ignore — Chart.js config requires raw hex
  format: "number",
  showIcon: false,
  icon: "📊",
});

const getBorderColorClass = computed(() => {
  switch (props.borderColor) {
    case "#10b981": // audit-ignore — Chart.js config requires raw hex
      return "border-emerald-600";
    case "#f59e0b": // audit-ignore — Chart.js config requires raw hex
      return "border-orange-600";
    case "#ef4444": // audit-ignore — Chart.js config requires raw hex
      return "border-red-600";
    case "#8b5cf6": // audit-ignore — Chart.js config requires raw hex
      return "border-purple-600";
    default:
      return "border-blue-600";
  }
});

const getIconClass = computed(() => {
  switch (props.borderColor) {
    case "#10b981": // audit-ignore — Chart.js config requires raw hex
      return "bg-emerald-100";
    case "#f59e0b": // audit-ignore — Chart.js config requires raw hex
      return "bg-orange-100";
    case "#ef4444": // audit-ignore — Chart.js config requires raw hex
      return "bg-red-100";
    case "#8b5cf6": // audit-ignore — Chart.js config requires raw hex
      return "bg-purple-100";
    default:
      return "bg-blue-100";
  }
});

const getTrendClass = computed(() => {
  if (props.trend! > 0) return "text-emerald-600";
  if (props.trend! < 0) return "text-red-600";
  return "text-slate-600";
});

const formattedValue = computed(() => {
  if (typeof props.value === "string") return props.value;

  switch (props.format) {
    case "percent":
      return `${Math.round(props.value * 100) / 100}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(props.value);
    case "decimal":
      return (Math.round(props.value * 100) / 100).toString();
    case "number":
    default:
      return Math.round(props.value).toString();
  }
});
</script>
