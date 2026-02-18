<script setup lang="ts">
import { ref, onErrorCaptured, defineComponent, h } from "vue";

const error = ref<Error | null>(null);
const key = ref(0);

onErrorCaptured((err: Error) => {
  error.value = err;
  return false; // prevent propagating further up
});

function retry() {
  error.value = null;
  key.value++;
}

// Thin renderless wrapper: changing :key forces Vue to remount this component
// and therefore remount all slotted children, clearing their error state.
const SlotWrapper = defineComponent({
  setup(_, { slots }) {
    return () => slots.default?.();
  },
});
</script>

<template>
  <div
    v-if="error"
    data-testid="error-fallback"
    class="flex min-h-[200px] flex-col items-center justify-center p-8 text-center"
  >
    <p class="text-lg font-semibold text-gray-800">Something went wrong</p>
    <p class="mt-1 text-sm text-gray-500">{{ error.message }}</p>
    <button
      data-testid="error-retry"
      class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      @click="retry"
    >
      Try again
    </button>
  </div>
  <SlotWrapper v-else :key="key">
    <slot />
  </SlotWrapper>
</template>
