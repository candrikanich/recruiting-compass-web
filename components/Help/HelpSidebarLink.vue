<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
    :class="isActive
      ? 'border-l-2 border-primary-500 bg-primary-50 font-semibold text-primary-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
  >
    <UIcon :name="icon" class="size-4 shrink-0" />
    <span>{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  to: string
  icon: string
  label: string
}>()

const route = useRoute()
const isActive = computed(() => route.path === props.to)
</script>
