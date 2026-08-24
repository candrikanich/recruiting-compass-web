<template>
  <div class="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-xs">
    <div class="flex items-start gap-3">
      <div class="mt-0.5 shrink-0">
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
        <h3 class="mb-2 text-lg font-semibold text-blue-900">
          Consider Other Divisions
        </h3>
        <p class="mb-3 text-blue-800">
          {{ recommendation.message }}
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="division in recommendation.recommendedDivisions"
            :key="division"
            class="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
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
