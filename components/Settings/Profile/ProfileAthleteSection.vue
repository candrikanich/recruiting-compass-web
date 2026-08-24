<template>
  <section class="rounded-xl border border-emerald-200 bg-white p-6 shadow-xs">
    <div class="flex items-start gap-4">
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100"
      >
        <UIcon name="i-heroicons-trophy" class="h-5 w-5 text-emerald-600" />
      </div>
      <div class="flex-1">
        <h2 class="text-lg font-semibold text-slate-900">Athlete Profile</h2>
        <p class="mt-1 text-sm text-slate-500">
          Manage your recruiting profile — positions, stats, academic scores,
          and social handles.
        </p>
        <NuxtLink
          to="/settings/player-details"
          class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Go to Athlete Profile
          <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts"></script>
