<script setup lang="ts">
import { computed } from "vue";

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
  click: [event: MouseEvent | KeyboardEvent];
}>();

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const cardClasses = computed(() => {
  const base =
    "rounded-xl bg-white text-brand-slate-900 border border-brand-slate-200";
  const shadow = "shadow-xs";
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

function handleKeydown(event: KeyboardEvent) {
  if (!props.clickable) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("click", event);
  }
}
</script>

<template>
  <div
    :class="cardClasses"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </div>
</template>
