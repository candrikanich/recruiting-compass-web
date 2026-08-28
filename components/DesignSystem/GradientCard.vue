<script setup lang="ts">
import { computed } from "vue";

export type GradientColor = "blue" | "purple" | "emerald" | "orange" | "indigo";
export type CardPadding = "none" | "sm" | "md" | "lg";

interface Props {
  gradient?: GradientColor;
  padding?: CardPadding;
  hover?: boolean;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  gradient: "blue",
  padding: "md",
  hover: false,
  clickable: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const gradientClasses: Record<GradientColor, string> = {
  blue: "bg-linear-to-br from-brand-blue-500 to-brand-blue-600",
  purple: "bg-linear-to-br from-brand-purple-500 to-brand-purple-600",
  emerald: "bg-linear-to-br from-brand-emerald-500 to-brand-emerald-600",
  orange: "bg-linear-to-br from-brand-orange-500 to-brand-orange-600",
  indigo: "bg-linear-to-br from-brand-indigo-500 to-brand-indigo-600",
};

const cardClasses = computed(() => {
  const base = "rounded-lg text-white";
  const gradient = gradientClasses[props.gradient];
  const shadow = "shadow-md";
  const padding = paddingClasses[props.padding];
  const hoverEffect = props.hover
    ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    : "";
  const cursor = props.clickable ? "cursor-pointer" : "";

  return [base, gradient, shadow, padding, hoverEffect, cursor]
    .filter(Boolean)
    .join(" ");
});

function handleClick(event: MouseEvent) {
  if (props.clickable) {
    emit("click", event);
  }
}
</script>

<template>
  <div :class="cardClasses" @click="handleClick">
    <slot />
  </div>
</template>
