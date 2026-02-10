<template>
  <div class="relative inline-block group">
    <slot />
    <div
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>
