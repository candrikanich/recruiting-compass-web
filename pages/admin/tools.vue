<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h1 class="text-2xl font-bold text-slate-900 mb-6">Tools</h1>
    <p class="text-slate-600 mb-6">Quick links to admin utilities.</p>
    <div class="flex flex-wrap gap-4">
      <NuxtLink
        to="/admin/signup"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        Invite admin user
      </NuxtLink>
      <NuxtLink
        to="/admin/batch-fetch-logos"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        Batch fetch school logos
      </NuxtLink>
      <NuxtLink
        to="/admin/notifications/broadcast"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition"
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
