<script setup lang="ts">
export type BadgeColor =
  | "blue"
  | "purple"
  | "emerald"
  | "orange"
  | "slate"
  | "red";
export type BadgeVariant = "solid" | "light";
export type BadgeSize = "sm" | "md";

interface Props {
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const props = withDefaults(defineProps<Props>(), {
  color: "blue",
  variant: "light",
  size: "md",
});

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
};

const colorVariants: Record<BadgeColor, Record<BadgeVariant, string>> = {
  blue: {
    solid: "bg-brand-blue-600 text-white",
    light: "bg-brand-blue-200 text-brand-blue-900",
  },
  purple: {
    solid: "bg-brand-purple-600 text-white",
    light: "bg-brand-purple-200 text-brand-purple-900",
  },
  emerald: {
    solid: "bg-brand-emerald-600 text-white",
    light: "bg-brand-emerald-200 text-brand-emerald-900",
  },
  orange: {
    solid: "bg-brand-orange-600 text-white",
    light: "bg-brand-orange-100 text-brand-orange-700",
  },
  slate: {
    solid: "bg-brand-slate-700 text-white",
    light: "bg-brand-slate-200 text-brand-slate-900",
  },
  red: {
    solid: "bg-brand-red-600 text-white",
    light: "bg-brand-red-200 text-brand-red-900",
  },
};

const badgeClasses = computed(() => {
  const base = "inline-flex items-center font-medium rounded-full";
  const size = sizeClasses[props.size];
  const colorVariant = colorVariants[props.color][props.variant];

  return [base, size, colorVariant].join(" ");
});
</script>

<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>
