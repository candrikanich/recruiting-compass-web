<template>
  <div
    v-if="isViewingAsParent"
    class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6"
  >
    <div class="flex items-center">
      <EyeIcon class="w-5 h-5 text-indigo-600 mr-3" />
      <p class="text-sm text-indigo-800">
        You're viewing
        <strong>{{ athleteName || "this athlete" }}'s</strong>
        recruiting data. Data is read-only. Your views are visible to them.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon } from "@heroicons/vue/24/solid";

defineProps<{
  isViewingAsParent: boolean;
  athleteName?: string;
}>();
</script>
