<template>
  <div class="rounded-lg bg-white p-6 shadow-md">
    <h1 class="mb-6 text-2xl font-bold text-slate-900">Tools</h1>
    <p class="mb-6 text-slate-600">Quick links to admin utilities.</p>
    <div class="flex flex-wrap gap-4">
      <NuxtLink
        to="/admin/signup"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Invite admin user
      </NuxtLink>
      <NuxtLink
        to="/admin/batch-fetch-logos"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Batch fetch school logos
      </NuxtLink>
      <NuxtLink
        to="/admin/notifications/broadcast"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Broadcast notification
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});
</script>
