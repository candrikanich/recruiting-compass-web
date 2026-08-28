<script setup lang="ts">
export type LoadingStateVariant = "spinner" | "skeleton" | "shimmer";

interface Props {
  message?: string;
  variant?: LoadingStateVariant;
}

const props = withDefaults(defineProps<Props>(), {
  message: "Loading...",
  variant: "spinner",
});

function variantLabel(variant: LoadingStateVariant): string {
  switch (variant) {
    case "spinner":
    case "skeleton":
    case "shimmer":
      return props.message;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center px-4 py-12"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div v-if="variant === 'spinner'" class="animate-spin" aria-hidden="true">
      <svg
        class="h-12 w-12 text-brand-blue-500"
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
    </div>

    <div
      v-else-if="variant === 'skeleton'"
      class="w-full max-w-md space-y-3"
      aria-hidden="true"
    >
      <div class="h-4 animate-pulse rounded-sm bg-brand-slate-200" />
      <div class="h-4 animate-pulse rounded-sm bg-brand-slate-200" />
      <div class="h-4 w-2/3 animate-pulse rounded-sm bg-brand-slate-200" />
    </div>

    <div v-else-if="variant === 'shimmer'" class="w-full max-w-md" aria-hidden="true">
      <div class="shimmer h-20 rounded-md bg-linear-to-r from-brand-slate-200 via-brand-slate-100 to-brand-slate-200" />
    </div>

    <p class="mt-4 text-center text-brand-slate-600">
      {{ variantLabel(variant) }}
    </p>
  </div>
</template>

<style scoped>
.shimmer {
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: calc(200% + 20px) 0;
  }
}
</style>
