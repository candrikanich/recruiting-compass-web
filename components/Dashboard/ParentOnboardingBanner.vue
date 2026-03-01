<template>
  <div
    role="region"
    aria-label="Athlete onboarding"
    class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6"
  >
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <UserPlusIcon class="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
        <p class="text-sm text-amber-800">
          <strong>Connect your athlete to get started</strong> —
          invite them to join your family or share your family code.
        </p>
      </div>
      <NuxtLink
        to="/settings/family-management"
        class="shrink-0 px-4 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
      >
        Invite Athlete <span aria-hidden="true">→</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserPlusIcon } from '@heroicons/vue/24/solid'
</script>
