<script setup lang="ts">
export type ButtonVariant = "gradient" | "outline" | "solid" | "ghost";
export type ButtonColor =
  | "blue"
  | "purple"
  | "emerald"
  | "orange"
  | "indigo"
  | "slate";
export type ButtonSize = "sm" | "md" | "lg";

interface Props {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "solid",
  color: "blue",
  size: "md",
  fullWidth: false,
  disabled: false,
  loading: false,
  type: "button",
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

const focusRingClasses: Record<ButtonColor, string> = {
  blue: "focus:ring-brand-blue-500",
  purple: "focus:ring-brand-purple-500",
  emerald: "focus:ring-brand-emerald-500",
  orange: "focus:ring-brand-orange-500",
  indigo: "focus:ring-brand-indigo-500",
  slate: "focus:ring-brand-slate-500",
};

const colorVariants: Record<ButtonColor, Record<ButtonVariant, string>> = {
  blue: {
    solid: "bg-brand-blue-600 text-white hover:bg-brand-blue-700",
    gradient:
      "bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 text-white hover:from-brand-blue-600 hover:to-brand-blue-700",
    outline:
      "border-2 border-brand-blue-500 text-brand-blue-600 hover:bg-brand-blue-100",
    ghost: "text-brand-blue-600 hover:bg-brand-blue-100",
  },
  purple: {
    solid: "bg-brand-purple-600 text-white hover:bg-brand-purple-700",
    gradient:
      "bg-gradient-to-r from-brand-purple-500 to-brand-purple-600 text-white hover:from-brand-purple-600 hover:to-brand-purple-700",
    outline:
      "border-2 border-brand-purple-500 text-brand-purple-600 hover:bg-brand-purple-100",
    ghost: "text-brand-purple-600 hover:bg-brand-purple-100",
  },
  emerald: {
    solid: "bg-brand-emerald-600 text-white hover:bg-brand-emerald-700",
    gradient:
      "bg-gradient-to-r from-brand-emerald-500 to-brand-emerald-600 text-white hover:from-brand-emerald-600 hover:to-brand-emerald-700",
    outline:
      "border-2 border-brand-emerald-500 text-brand-emerald-600 hover:bg-brand-emerald-100",
    ghost: "text-brand-emerald-600 hover:bg-brand-emerald-100",
  },
  orange: {
    solid: "bg-brand-orange-600 text-white hover:bg-brand-orange-700",
    gradient:
      "bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 text-white hover:from-brand-orange-600 hover:to-brand-orange-700",
    outline:
      "border-2 border-brand-orange-500 text-brand-orange-600 hover:bg-brand-orange-100",
    ghost: "text-brand-orange-600 hover:bg-brand-orange-100",
  },
  indigo: {
    solid: "bg-brand-indigo-600 text-white hover:bg-brand-indigo-600",
    gradient:
      "bg-gradient-to-r from-brand-indigo-500 to-brand-indigo-600 text-white hover:from-brand-indigo-600 hover:to-brand-indigo-600",
    outline:
      "border-2 border-brand-indigo-500 text-brand-indigo-600 hover:bg-brand-indigo-100",
    ghost: "text-brand-indigo-600 hover:bg-brand-indigo-100",
  },
  slate: {
    solid: "bg-brand-slate-700 text-white hover:bg-brand-slate-700",
    gradient:
      "bg-gradient-to-r from-brand-slate-700 to-brand-slate-700 text-white hover:from-brand-slate-700 hover:to-brand-slate-700",
    outline:
      "border-2 border-brand-slate-600 text-brand-slate-700 hover:bg-brand-slate-100",
    ghost: "text-brand-slate-700 hover:bg-brand-slate-100",
  },
};

const buttonClasses = computed(() => {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const size = sizeClasses[props.size];
  const colorVariant = colorVariants[props.color][props.variant];
  const width = props.fullWidth ? "w-full" : "";
  const disabled =
    props.disabled || props.loading ? "opacity-50 cursor-not-allowed" : "";
  const focusRing = focusRingClasses[props.color];

  return [base, size, colorVariant, width, disabled, focusRing]
    .filter(Boolean)
    .join(" ");
});

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
}
</script>

<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>
