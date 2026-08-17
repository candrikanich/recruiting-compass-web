<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h1 class="text-2xl font-bold text-slate-900 mb-6">Overview</h1>
    <div v-if="statsLoading" class="text-center py-12 text-slate-600">
      Loading stats...
    </div>
    <div
      v-else-if="statsError"
      class="bg-red-50 border border-red-200 rounded-lg p-4"
    >
      <p class="text-red-800">{{ statsError }}</p>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAdminStats } from "~/composables/useAdminStats";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const { stats, statsLoading, statsError, loadStats } = useAdminStats();

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

onMounted(async () => {
  await loadStats();
});
</script>
