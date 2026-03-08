<template>
  <div
    role="region"
    aria-label="Get started"
    class="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-xs mb-6"
  >
    <div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
      <UsersIcon class="w-8 h-8 text-amber-500" aria-hidden="true" />
    </div>
    <h2 class="text-xl font-semibold text-gray-900 mb-2">
      Your athlete isn't connected yet
    </h2>
    <p class="text-gray-500 max-w-sm mb-6">
      Once they accept your invite, you'll see their recruiting activity, school list, and progress
      here.
    </p>
    <NuxtLink
      to="/settings/family-management"
      class="px-6 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
    >
      Invite Athlete
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon } from '@heroicons/vue/24/solid'
</script>
