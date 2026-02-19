<template>
  <a
    :href="to"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
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
