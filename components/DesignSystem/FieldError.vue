<template>
  <Transition name="fade">
    <div
      v-if="error"
      :id="id"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      class="mt-1 flex items-start gap-1 text-sm text-red-600"
    >
      <UIcon
        name="i-heroicons-exclamation-circle-solid"
        class="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span>{{ error }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  id?: string;
  error?: string;
}>();
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
