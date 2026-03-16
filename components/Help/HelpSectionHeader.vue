<template>
  <div class="mb-4 flex items-center gap-2.5">
    <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
    <HelpBadge v-if="badge" :type="badge" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  badge?: 'new' | 'required' | 'optional'
}>()
</script>
