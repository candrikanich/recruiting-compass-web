<template>
  <Transition name="fade">
    <div v-if="error" class="mt-1 text-sm text-red-600 flex items-start gap-1">
      <ExclamationCircleIcon class="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{{ error }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ExclamationCircleIcon } from "@heroicons/vue/24/solid";

defineProps<{
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
