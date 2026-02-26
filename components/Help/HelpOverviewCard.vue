<template>
  <NuxtLink
    :to="`/help/${slug}`"
    class="group flex flex-col gap-3 rounded-xl border border-gray-200 p-5 transition-all hover:border-primary-300 hover:shadow-sm"
  >
    <div class="flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
      <UIcon :name="icon" class="size-5" />
    </div>
    <div>
      <p class="font-semibold text-gray-900">{{ title }}</p>
      <p class="mt-0.5 text-sm text-gray-500">{{ description }}</p>
    </div>
    <div class="flex items-center gap-1 text-xs font-medium text-primary-600">
      Read guide
      <UIcon name="i-heroicons-arrow-right" class="size-3 transition-transform group-hover:translate-x-0.5" />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  slug: string
  icon: string
  title: string
  description: string
}>()
</script>
