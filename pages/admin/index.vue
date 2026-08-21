<template>
  <div class="space-y-6">
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

    <div v-if="stats && !statsError" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold text-slate-900">Schools by division</h2>
        <p class="text-sm text-slate-500 mb-4">
          Where {{ stats.schools }} schools sit across NCAA / NAIA / JUCO.
        </p>
        <div class="h-64">
          <AdminChart type="bar" :data="divisionData" :options="hBarOptions" />
        </div>
      </section>

      <section class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold text-slate-900">Types of users</h2>
        <p class="text-sm text-slate-500 mb-4">
          Role split across {{ stats.users }} users.
        </p>
        <div class="h-64">
          <AdminChart type="doughnut" :data="userRoleData" :options="donutOptions" />
        </div>
      </section>

      <section class="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
        <div class="flex items-baseline justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">
              New users over time
            </h2>
            <p class="text-sm text-slate-500 mb-4">
              Signups per week, last {{ stats.newUsersWeekly?.length ?? 0 }} weeks.
            </p>
          </div>
          <NuxtLink
            to="/admin/growth"
            class="text-sm font-medium text-brand-blue-600 hover:underline whitespace-nowrap"
          >
            Full growth →
          </NuxtLink>
        </div>
        <div class="h-64">
          <AdminChart type="line" :data="signupTrendData" :options="lineOptions" />
        </div>
      </section>

      <section class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold text-slate-900">Types of coaches</h2>
        <p class="text-sm text-slate-500 mb-4">
          Role split across {{ stats.coaches }} coaches.
        </p>
        <div class="h-64">
          <AdminChart type="bar" :data="coachRoleData" :options="hBarOptions" />
        </div>
      </section>

      <section class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold text-slate-900">Interactions</h2>
        <p class="text-sm text-slate-500 mb-4">
          Kept as a stat — too few logged to chart meaningfully yet.
        </p>
        <div class="flex items-baseline gap-3">
          <span class="text-4xl font-bold text-slate-900">
            {{ stats.interactions }}
          </span>
          <span class="text-sm text-slate-500">total interactions logged</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { ChartData, ChartOptions } from "chart.js";
import { useAdminStats } from "~/composables/useAdminStats";
import type { BreakdownSlice } from "~/utils/adminBreakdown";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const { stats, statsLoading, statsError, loadStats } = useAdminStats();

// CVD-validated categorical palette (matches the concept mockup).
// audit-ignore — Chart.js configs require raw hex; not themeable CSS vars.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const GRID = "#e2e8f0"; // audit-ignore — Chart.js grid color

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

function barData(slices: BreakdownSlice[], color: string): ChartData {
  return {
    labels: slices.map((s) => s.value),
    datasets: [
      { label: "Count", data: slices.map((s) => s.count), backgroundColor: color },
    ],
  };
}

const divisionData = computed(() =>
  barData(stats.value?.byDivision ?? [], SERIES[0]),
);
const coachRoleData = computed(() =>
  barData(stats.value?.byCoachRole ?? [], SERIES[1]),
);

const userRoleData = computed<ChartData>(() => {
  const slices = stats.value?.byUserRole ?? [];
  return {
    labels: slices.map((s) => s.value),
    datasets: [
      { data: slices.map((s) => s.count), backgroundColor: SERIES },
    ],
  };
});

const signupTrendData = computed<ChartData>(() => {
  const weeks = stats.value?.newUsersWeekly ?? [];
  return {
    labels: weeks.map((w) => w.weekStart.slice(5)),
    datasets: [
      {
        label: "New users",
        data: weeks.map((w) => w.count),
        borderColor: SERIES[0],
        backgroundColor: "rgba(42,120,214,0.15)", // audit-ignore — Chart.js fill
        fill: true,
        tension: 0.3,
      },
    ],
  };
});

const hBarOptions: ChartOptions = {
  indexAxis: "y",
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID } },
    y: { grid: { display: false } },
  },
};

const donutOptions: ChartOptions = {
  plugins: { legend: { position: "right" } },
};

const lineOptions: ChartOptions = {
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID } },
  },
};

onMounted(async () => {
  await loadStats();
});
</script>
