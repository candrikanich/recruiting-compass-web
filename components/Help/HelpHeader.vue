<template>
  <header class="sticky top-0 z-40 border-b border-gray-200 bg-white">
    <div class="flex h-14 items-center justify-between px-4 sm:px-6">
      <NuxtLink to="/help" class="flex items-center gap-2">
        <img src="/assets/logos/recruiting-compass-mark.svg" alt="The Recruiting Compass" class="size-6" />
        <span class="font-semibold text-gray-900">Help Center</span>
      </NuxtLink>

      <button
        type="button"
        class="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        @click="goBack"
      >
        <UIcon name="i-heroicons-arrow-left" class="size-4" />
        <span class="hidden sm:inline">Back to App</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
const router = useRouter();

function goBack() {
  router.back();
}
</script>
