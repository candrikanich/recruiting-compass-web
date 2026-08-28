<script setup lang="ts">
interface Props {
  error: Error | string | null;
  title?: string;
  retryable?: boolean;
  retryLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Something went wrong",
  retryable: true,
  retryLabel: "Try Again",
});

const emit = defineEmits<{
  retry: [];
}>();

function getErrorMessage(error: Error | string | null): string {
  if (!error) return "An unexpected error occurred";
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : "An unexpected error occurred";
  }
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed.length > 0 ? trimmed : "An unexpected error occurred";
  }
  return "An unexpected error occurred";
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center px-4 py-12"
    role="alert"
    aria-live="assertive"
  >
    <div
      class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-red-100"
      aria-hidden="true"
    >
      <svg
        class="h-8 w-8 text-brand-red-600"
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

    <h3 class="mb-2 text-center text-lg font-semibold text-brand-slate-900">
      {{ title }}
    </h3>

    <p class="mb-6 max-w-md text-center text-brand-slate-600">
      {{ getErrorMessage(props.error) }}
    </p>

    <DesignSystemButton
      v-if="retryable"
      color="blue"
      variant="solid"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </DesignSystemButton>
  </div>
</template>
