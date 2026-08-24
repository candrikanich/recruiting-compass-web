<template>
  <div
    role="region"
    aria-label="Get started"
    class="mb-6 flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 py-16 text-center shadow-xs"
  >
    <div
      class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50"
    >
      <UIcon
        name="i-heroicons-users-solid"
        class="h-8 w-8 text-amber-500"
        aria-hidden="true"
      />
    </div>
    <h2 class="mb-2 text-xl font-semibold text-gray-900">
      Your athlete isn't connected yet
    </h2>
    <p class="mb-6 max-w-sm text-gray-500">
      Once they accept your invite, you'll see their recruiting activity, school
      list, and progress here.
    </p>
    <NuxtLink
      to="/settings/family-management"
      class="rounded-lg bg-amber-600 px-6 py-2.5 font-semibold text-white transition hover:bg-amber-700 focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
    >
      Invite Athlete
    </NuxtLink>
  </div>
</template>

<script setup lang="ts"></script>
