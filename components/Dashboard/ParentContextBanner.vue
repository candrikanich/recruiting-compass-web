<template>
  <div
    v-if="isViewingAsParent"
    role="alert"
    aria-live="polite"
    aria-atomic="true"
    class="mb-6 rounded-r-lg border-l-4 border-indigo-500 bg-indigo-50 p-4 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    tabindex="0"
  >
    <div class="flex items-center">
      <UIcon
        name="i-heroicons-eye-solid"
        class="mr-3 h-5 w-5 text-indigo-600"
        aria-hidden="true"
      />
      <p class="text-sm text-indigo-800">
        <strong>Parent View Mode Active:</strong> You're viewing
        <strong>{{ athleteName || "this athlete" }}'s</strong>
        recruiting data. Data is read-only. Your views are visible to them.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isViewingAsParent: boolean;
  athleteName?: string;
}>();
</script>
