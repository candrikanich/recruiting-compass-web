<template>
  <div class="mt-16 border-t border-gray-200 pt-8">
    <div v-if="!submitted" class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-medium text-gray-900">Was this page helpful?</p>
        <p class="text-sm text-gray-500">Your feedback helps us improve our docs.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
          :disabled="loading"
          @click="submit(true)"
        >
          <UIcon name="i-heroicons-hand-thumb-up" class="size-4" />
          Yes
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          :disabled="loading"
          @click="submit(false)"
        >
          <UIcon name="i-heroicons-hand-thumb-down" class="size-4" />
          No
        </button>
      </div>
    </div>

    <p v-else class="text-sm font-medium text-green-700">
      <UIcon name="i-heroicons-check-circle" class="mr-1 inline size-4" />
      Thanks for your feedback!
    </p>

    <div class="mt-4 flex items-center gap-1.5 text-sm text-gray-500">
      <UIcon name="i-heroicons-envelope" class="size-4" />
      Need more help?
      <a
        href="mailto:support@therecruitingcompass.com"
        class="font-medium text-primary-600 hover:underline"
      >
        Contact support
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const route = useRoute()

const submitted = ref(false)
const loading = ref(false)

async function submit(helpful: boolean) {
  loading.value = true
  try {
    await $fetch('/api/help/feedback', {
      method: 'POST',
      body: { page: route.path, helpful },
    })
  } catch {
    // Silently fail — feedback is non-critical
  } finally {
    loading.value = false
    submitted.value = true
  }
}
</script>
