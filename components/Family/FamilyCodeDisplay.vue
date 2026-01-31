<template>
  <div class="border border-blue-200 bg-blue-50 rounded-lg p-4">
    <h3 class="text-lg font-semibold text-blue-900 mb-2">
      Your Family Code
    </h3>
    <p class="text-sm text-blue-700 mb-4">
      Share this code with your parents so they can access your recruiting data.
    </p>

    <div class="bg-white border border-blue-300 rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between">
        <div
          class="font-mono text-3xl font-bold text-blue-900 tracking-wider"
        >
          {{ familyCode }}
        </div>
        <button
          @click="$emit('copy', familyCode)"
          class="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        class="text-blue-600 hover:text-blue-800 underline"
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
