<template>
  <NuxtLink
    :to="`/help/${slug}`"
    class="group hover:border-primary-300 flex flex-col gap-3 rounded-xl border border-gray-200 p-5 transition-all hover:shadow-xs"
  >
    <div
      class="bg-primary-50 text-primary-600 group-hover:bg-primary-100 flex size-10 items-center justify-center rounded-lg transition-colors"
    >
      <UIcon :name="icon" class="size-5" />
    </div>
    <div>
      <p class="font-semibold text-gray-900">{{ title }}</p>
      <p class="mt-0.5 text-sm text-gray-500">{{ description }}</p>
    </div>
    <div class="text-primary-600 flex items-center gap-1 text-xs font-medium">
      Read guide
      <UIcon
        name="i-heroicons-arrow-right"
        class="size-3 transition-transform group-hover:translate-x-0.5"
      />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  slug: string;
  icon: string;
  title: string;
  description: string;
}>();
</script>
