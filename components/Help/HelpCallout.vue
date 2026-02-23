<template>
  <div class="my-4 flex gap-3 rounded-lg p-4" :class="styles[type].bg">
    <UIcon :name="styles[type].icon" class="mt-0.5 size-5 shrink-0" :class="styles[type].icon_color" />
    <div class="text-sm leading-relaxed" :class="styles[type].text">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'tip' | 'info' | 'warning' | 'important'
}>()

const styles = {
  tip: {
    bg: 'bg-green-50 border border-green-200',
    icon: 'i-heroicons-light-bulb',
    icon_color: 'text-green-600',
    text: 'text-green-800',
  },
  info: {
    bg: 'bg-blue-50 border border-blue-200',
    icon: 'i-heroicons-information-circle',
    icon_color: 'text-blue-600',
    text: 'text-blue-800',
  },
  warning: {
    bg: 'bg-amber-50 border border-amber-200',
    icon: 'i-heroicons-exclamation-triangle',
    icon_color: 'text-amber-600',
    text: 'text-amber-800',
  },
  important: {
    bg: 'bg-red-50 border border-red-200',
    icon: 'i-heroicons-flag',
    icon_color: 'text-red-600',
    text: 'text-red-800',
  },
} as const
</script>
