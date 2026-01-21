<template>
  <div class="flex flex-col items-center justify-center py-12">
    <!-- Spinner -->
    <div v-if="variant === 'spinner'" class="animate-spin">
      <svg
        class="w-12 h-12 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>

    <!-- Skeleton -->
    <div v-else-if="variant === 'skeleton'" class="space-y-3 w-full max-w-md">
      <div class="h-4 bg-slate-200 rounded animate-pulse" />
      <div class="h-4 bg-slate-200 rounded animate-pulse" />
      <div class="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
    </div>

    <!-- Shimmer -->
    <div v-else-if="variant === 'shimmer'" class="w-full max-w-md">
      <div
        class="h-20 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded"
        style="
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        "
      />
    </div>

    <!-- Message -->
    <p class="text-slate-600 text-center mt-4">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
export type LoadingStateVariant = 'spinner' | 'skeleton' | 'shimmer'

interface Props {
  message?: string
  variant?: LoadingStateVariant
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  variant: 'spinner',
})
</script>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: calc(200% + 20px) 0;
  }
}
</style>
