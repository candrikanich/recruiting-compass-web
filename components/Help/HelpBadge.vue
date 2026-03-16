<template>
  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="styles[type]">
    {{ labels[type] }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  type: 'new' | 'required' | 'optional'
}>()

const labels = {
  new: 'New',
  required: 'Required',
  optional: 'Optional',
} as const

const styles = {
  new: 'bg-blue-100 text-blue-700',
  required: 'bg-red-100 text-red-700',
  optional: 'bg-gray-100 text-gray-600',
} as const
</script>
