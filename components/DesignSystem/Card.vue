<script setup lang="ts">
export type CardPadding = "none" | "sm" | "md" | "lg";

interface Props {
  padding?: CardPadding;
  hover?: boolean;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
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

const cardClasses = computed(() => {
  const base = "rounded-xl bg-white text-slate-900 border border-slate-200";
  const shadow = "shadow-sm";
  const padding = paddingClasses[props.padding];
  const hoverEffect = props.hover
    ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    : "";
  const cursor = props.clickable ? "cursor-pointer" : "";

  return [base, shadow, padding, hoverEffect, cursor].filter(Boolean).join(" ");
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
