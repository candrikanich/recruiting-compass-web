<template>
  <div class="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-6">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        <svg
          class="h-6 w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">
          Consider Other Divisions
        </h3>
        <p class="text-blue-800 mb-3">
          {{ recommendation.message }}
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="division in recommendation.recommendedDivisions"
            :key="division"
            class="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full"
          >
            {{ division }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DivisionRecommendation } from "~/types/timeline";

defineProps<{
  recommendation: DivisionRecommendation;
}>();
</script>
