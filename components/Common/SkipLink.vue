<template>
  <a
    :href="to"
    class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg"
  >
    {{ text }}
  </a>
</template>

<script setup lang="ts">
defineProps<{
  to: string;
  text: string;
}>();
</script>

<style scoped>
.sr-only {
  @apply absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0;
}

.sr-only:focus,
.focus\:not-sr-only:focus {
  @apply relative w-auto h-auto p-2 m-0 overflow-visible whitespace-normal;
}
</style>
