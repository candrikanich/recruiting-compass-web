<script setup lang="ts">
import { computed } from "vue";

export type AlertVariant = "info" | "success" | "warning" | "error";

interface Props {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "info",
  dismissible: false,
  compact: false,
});

const emit = defineEmits<{
  dismiss: [];
}>();

const isAssertive = computed(
  () => props.variant === "error" || props.variant === "warning",
);

const toneClasses: Record<AlertVariant, string> = {
  info: "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-900",
  success:
    "border-brand-emerald-200 bg-brand-emerald-50 text-brand-emerald-900",
  warning: "border-brand-orange-200 bg-brand-orange-50 text-brand-orange-900",
  error: "border-brand-red-200 bg-brand-red-50 text-brand-red-900",
};

const iconClasses: Record<AlertVariant, string> = {
  info: "text-brand-blue-600",
  success: "text-brand-emerald-600",
  warning: "text-brand-orange-600",
  error: "text-brand-red-600",
};

function iconName(variant: AlertVariant): string {
  switch (variant) {
    case "info":
      return "i-heroicons-information-circle";
    case "success":
      return "i-heroicons-check-circle";
    case "warning":
      return "i-heroicons-exclamation-triangle";
    case "error":
      return "i-heroicons-exclamation-circle";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function dismissLabel(variant: AlertVariant): string {
  switch (variant) {
    case "info":
      return "Dismiss information";
    case "success":
      return "Dismiss success message";
    case "warning":
      return "Dismiss warning";
    case "error":
      return "Dismiss error";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
</script>

<template>
  <div
    :role="isAssertive ? 'alert' : 'status'"
    :aria-live="isAssertive ? 'assertive' : 'polite'"
    aria-atomic="true"
    :class="[
      'flex items-start gap-3 rounded-xl border',
      compact ? 'p-3' : 'p-4',
      toneClasses[variant],
    ]"
  >
    <UIcon
      :name="iconName(variant)"
      :class="['mt-0.5 h-5 w-5 shrink-0', iconClasses[variant]]"
      aria-hidden="true"
    />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div :class="title ? 'mt-1 text-sm opacity-90' : 'text-sm'">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="shrink-0 rounded-md p-1 transition hover:bg-brand-slate-900/5 focus:ring-2 focus:ring-offset-2 focus:outline-none"
      :aria-label="dismissLabel(variant)"
      @click="emit('dismiss')"
    >
      <UIcon name="i-heroicons-x-mark" class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>
