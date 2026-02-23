<template>
  <figure class="my-6">
    <div
      v-if="src"
      class="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
    >
      <img
        :src="src"
        :alt="alt ?? caption"
        class="w-full"
      />
    </div>
    <!-- Placeholder shown when no src provided -->
    <div
      v-else
      class="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
    >
      <div class="text-center">
        <UIcon name="i-heroicons-photo" class="mx-auto mb-1.5 size-8 text-gray-300" />
        <p class="text-xs text-gray-400">Screenshot coming soon</p>
      </div>
    </div>
    <figcaption v-if="caption" class="mt-2 text-center text-xs text-gray-500">
      {{ caption }}
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
defineProps<{
  src?: string
  caption?: string
  alt?: string
}>()
</script>
