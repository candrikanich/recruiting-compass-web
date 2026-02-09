<template>
  <div
    role="status"
    :aria-label="ariaLabel"
    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
    :class="badgeClass"
  >
    <div
      class="w-2 h-2 rounded-full"
      :class="dotClass"
      aria-hidden="true"
    ></div>
    <span class="text-sm font-medium">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  percentage: number;
}>();

const label = computed(() => {
  if (props.percentage >= 80) return "Very Responsive";
  if (props.percentage >= 60) return "Responsive";
  if (props.percentage >= 40) return "Moderate";
  if (props.percentage >= 20) return "Slow";
  return "Unresponsive";
});

const badgeClass = computed(() => {
  if (props.percentage >= 80)
    return "bg-brand-emerald-100 text-brand-emerald-700";
  if (props.percentage >= 60) return "bg-brand-blue-100 text-brand-blue-700";
  if (props.percentage >= 40)
    return "bg-brand-orange-100 text-brand-orange-700";
  if (props.percentage >= 20)
    return "bg-brand-orange-100 text-brand-orange-700";
  return "bg-brand-red-100 text-brand-red-700";
});

const dotClass = computed(() => {
  if (props.percentage >= 80) return "bg-brand-emerald-500";
  if (props.percentage >= 60) return "bg-brand-blue-500";
  if (props.percentage >= 40) return "bg-brand-orange-500";
  if (props.percentage >= 20) return "bg-brand-orange-500";
  return "bg-brand-red-500";
});

const ariaLabel = computed(
  () =>
    `Coach responsiveness: ${label.value} (${props.percentage}% response rate)`,
);
</script>
