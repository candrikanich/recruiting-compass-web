<template>
  <div
    :role="role"
    :aria-live="ariaLive"
    aria-atomic="true"
    class="p-4 rounded-lg border"
    :class="variantClasses"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type MessageVariant = "success" | "error" | "info" | "warning";

const props = withDefaults(
  defineProps<{
    variant: MessageVariant;
  }>(),
  {
    variant: "info",
  },
);

const role = computed(() => {
  return props.variant === "error" ? "alert" : "status";
});

const ariaLive = computed(() => {
  return props.variant === "error" ? "assertive" : "polite";
});

const variantClasses = computed(() => {
  switch (props.variant) {
    case "success":
      return "bg-emerald-50 border-emerald-200 text-emerald-900";
    case "error":
      return "bg-red-50 border-red-200 text-red-900";
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-900";
    case "info":
    default:
      return "bg-blue-50 border-blue-200 text-blue-900";
  }
});
</script>
