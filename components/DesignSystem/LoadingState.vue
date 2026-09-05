<script setup lang="ts">
export type LoadingStateVariant =
  | "spinner"
  | "skeleton"
  | "shimmer"
  | "reasoning";

interface Props {
  message?: string;
  variant?: LoadingStateVariant;
  /** Compact horizontal layout for embedding next to a button/label instead of a full-page block. */
  inline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  message: "Loading...",
  variant: "spinner",
  inline: false,
});

function variantLabel(variant: LoadingStateVariant): string {
  switch (variant) {
    case "spinner":
    case "skeleton":
    case "shimmer":
    case "reasoning":
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
    :class="
      inline
        ? 'inline-flex items-center gap-2'
        : 'flex flex-col items-center justify-center px-4 py-12'
    "
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

    <div
      v-else-if="variant === 'shimmer'"
      class="w-full max-w-md"
      aria-hidden="true"
    >
      <div
        class="shimmer h-20 rounded-md bg-linear-to-r from-brand-slate-200 via-brand-slate-100 to-brand-slate-200"
      />
    </div>

    <div
      v-else-if="variant === 'reasoning'"
      class="flex items-center gap-1.5"
      aria-hidden="true"
    >
      <span class="reasoning-dot" />
      <span class="reasoning-dot" />
      <span class="reasoning-dot" />
    </div>

    <p
      :class="
        inline ? 'text-sm text-brand-slate-600' : 'mt-4 text-center text-brand-slate-600'
      "
    >
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

.reasoning-dot {
  @apply h-2 w-2 rounded-full bg-brand-blue-500;
  animation: reasoning-bounce 1.1s ease-in-out infinite;
}

.reasoning-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.reasoning-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes reasoning-bounce {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: scale(0.7);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reasoning-dot {
    animation: none;
    opacity: 0.85;
  }
}
</style>
