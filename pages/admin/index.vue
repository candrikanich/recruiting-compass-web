<template>
  <div class="min-h-screen bg-slate-50 py-12 px-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to App
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p class="text-slate-600">Manage users and system settings</p>
      </div>

      <!-- Tab Navigation -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="selectTab(tab.id)"
          :class="[
            'px-4 py-2 font-medium rounded-lg transition',
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Overview Section -->
      <div
        v-if="activeTab === 'overview'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Overview</h2>
        <div v-if="statsLoading" class="text-center py-12 text-slate-600">
          Loading stats...
        </div>
        <div
          v-else-if="statsError"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-800">{{ statsError }}</p>
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <div
            v-for="stat in statsCards"
            :key="stat.key"
            class="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <p class="text-sm font-medium text-slate-500">{{ stat.label }}</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">
              {{ stat.value }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tools Section -->
      <div
        v-if="activeTab === 'tools'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Tools</h2>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAdminStats } from "~/composables/useAdminStats";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const { stats, statsLoading, statsError, loadStats } = useAdminStats();

const tabs = computed(() => [
  { id: "overview", label: "Overview" },
  { id: "tools", label: "Tools" },
]);

const statsCards = computed(() => {
  const s = stats.value;
  if (!s) return [];
  return [
    { key: "users", label: "Users", value: s.users },
    { key: "schools", label: "Schools", value: s.schools },
    { key: "coaches", label: "Coaches", value: s.coaches },
    { key: "interactions", label: "Interactions", value: s.interactions },
    { key: "family_units", label: "Family units", value: s.family_units },
  ];
});

function selectTab(tabId: string) {
  activeTab.value = tabId;
  if (tabId === "overview") loadStats();
}

onMounted(async () => {
  if (activeTab.value === "overview") await loadStats();
});
</script>
