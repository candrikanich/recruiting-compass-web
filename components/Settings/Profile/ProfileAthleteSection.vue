<template>
  <section class="bg-white rounded-xl border border-emerald-200 shadow-xs p-6">
    <div class="flex items-start gap-4">
      <div
        class="shrink-0 w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center"
      >
        <TrophyIcon class="w-5 h-5 text-emerald-600" />
      </div>
      <div class="flex-1">
        <h2 class="text-lg font-semibold text-slate-900">Athlete Profile</h2>
        <p class="text-sm text-slate-500 mt-1">
          Manage your recruiting profile — positions, stats, academic scores,
          and social handles.
        </p>
        <NuxtLink
          to="/settings/player-details"
          class="inline-flex items-center gap-1 mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Go to Athlete Profile
          <ArrowRightIcon class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { TrophyIcon, ArrowRightIcon } from "@heroicons/vue/24/outline";
</script>
