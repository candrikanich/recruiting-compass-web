<script setup lang="ts">
defineEmits<{
  "next-screen": [];
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8"
  >
    <div class="max-w-md w-full space-y-8 text-center">
      <!-- Icon -->
      <div class="flex justify-center">
        <div
          class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>

      <!-- Headline -->
      <h1 class="text-3xl font-bold text-slate-900">
        Let's set up your recruiting profile
      </h1>

      <!-- Subtext -->
      <p class="text-lg text-slate-600">
        This helps us personalize your recruiting journey and connect you with
        schools that are the right fit for you.
      </p>

      <!-- CTA Button -->
      <button
        type="button"
        class="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
        @click="$emit('next-screen')"
      >
        Get Started
      </button>

      <!-- Additional info -->
      <p class="text-sm text-slate-500">It takes just 5 minutes to complete</p>
    </div>
  </div>
</template>
