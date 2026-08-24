<template>
  <div class="flex flex-col items-center justify-center py-12">
    <!-- Error Icon -->
    <div
      class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
    >
      <svg
        class="h-8 w-8 text-red-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>

    <!-- Title -->
    <h3 class="mb-2 text-center text-lg font-semibold text-slate-900">
      {{ title }}
    </h3>

    <!-- Error Message -->
    <p class="mb-6 max-w-md text-center text-slate-600">
      {{ getErrorMessage(error) }}
    </p>

    <!-- Retry Button -->
    <button
      v-if="retryable"
      @click="$emit('retry')"
      class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  error: Error | string | null;
  title?: string;
  retryable?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: "Something went wrong",
  retryable: true,
});

defineEmits<{
  retry: [];
}>();

const getErrorMessage = (error: Error | string | null): string => {
  if (!error) return "An unexpected error occurred";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
};
</script>
