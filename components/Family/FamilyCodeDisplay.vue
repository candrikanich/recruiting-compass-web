<template>
  <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
    <h3 class="mb-2 text-lg font-semibold text-blue-900">Your Family Code</h3>
    <p class="mb-4 text-sm text-blue-700">
      Share this code with your parents so they can access your recruiting data.
    </p>

    <div class="mb-4 rounded-lg border border-blue-300 bg-white p-4">
      <div class="flex items-center justify-between">
        <div class="font-mono text-3xl font-bold tracking-wider text-blue-900">
          {{ familyCode }}
        </div>
        <button
          @click="$emit('copy', familyCode)"
          class="ml-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          📋 Copy
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-600">
        Generated {{ formatDate(codeGeneratedAt) }}
      </span>
      <button
        @click="$emit('regenerate')"
        class="text-blue-600 underline hover:text-blue-800"
      >
        Regenerate Code
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  familyCode: string;
  codeGeneratedAt: string | null;
}>();

defineEmits<{
  copy: [code: string];
  regenerate: [];
}>();

const formatDate = (date: string | null) => {
  if (!date) return "Date unknown";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
</script>
