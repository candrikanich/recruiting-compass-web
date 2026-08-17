<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAdminGrowth } from "~/composables/useAdminGrowth";

definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const { data, loading, error, fetchGrowth } = useAdminGrowth();

// Explicit `.value` access (not template auto-unref) so this works whether
// the composable returns a real ref or a test double shaped like one.
const growth = computed(() => data.value);
const isLoading = computed(() => loading.value);
const loadError = computed(() => error.value);

const range = ref({ days: 30 });

// "Accepted" is a different (smaller) population than "Accounts" (all users,
// including self-serve signups + admins), so a later funnel stage can have a
// higher count than the one before it — dropoffPct goes negative in that
// case. Only render the badge for an actual drop; a non-positive value isn't
// a meaningful "drop-off" for this funnel, so we omit the badge rather than
// show a misleading negative/double-dash figure.
function formatDropoff(count: number, dropoffPct: number | null): string {
  if (dropoffPct === null || dropoffPct <= 0) return `${count}`;
  return `${count} (-${dropoffPct}%)`;
}

function onRangeChange(value: { days: number }) {
  range.value = value;
  fetchGrowth(value.days);
}

const dailyTrendChartData = computed(() => {
  const trend = growth.value?.activity.dailyTrend ?? [];
  return {
    labels: trend.map((t) => t.day),
    datasets: [
      {
        label: "Daily active users",
        data: trend.map((t) => t.count),
        borderColor: "#2563eb", // audit-ignore
        backgroundColor: "#2563eb", // audit-ignore
        tension: 0.3,
      },
    ],
  };
});

const adoptionChartData = computed(() => {
  const features = growth.value?.adoption.features ?? [];
  return {
    labels: features.map((f) => f.feature),
    datasets: [
      {
        label: "Adoption %",
        data: features.map((f) => f.pct),
        backgroundColor: "#059669", // audit-ignore
      },
    ],
  };
});

onMounted(() => fetchGrowth(30));
</script>

<template>
  <section>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-brand-slate-900">Growth</h1>
      <AdminTimeRange :model-value="range" @update:model-value="onRangeChange" />
    </div>

    <DesignSystemLoadingState v-if="isLoading" />
    <DesignSystemErrorState v-else-if="loadError" :error="loadError" />
    <template v-else-if="growth">
      <!-- Funnel -->
      <h2 class="mb-2 text-sm font-semibold text-brand-slate-700">Funnel</h2>
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <AdminStatTile
          v-for="stage in growth.funnel"
          :key="stage.stage"
          :label="stage.stage"
          :value="formatDropoff(stage.count, stage.dropoffPct)"
        />
      </div>

      <!-- Activity -->
      <h2 class="mb-2 text-sm font-semibold text-brand-slate-700">Activity</h2>
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AdminStatTile label="DAU" :value="growth.activity.dau" />
        <AdminStatTile label="WAU" :value="growth.activity.wau" />
        <AdminStatTile label="MAU" :value="growth.activity.mau" />
      </div>

      <div class="mb-6 h-64 rounded-lg border border-brand-slate-200 bg-white p-4">
        <AdminChart type="line" :data="dailyTrendChartData" />
      </div>

      <!-- Adoption -->
      <h2 class="mb-2 text-sm font-semibold text-brand-slate-700">
        Feature adoption ({{ growth.adoption.totalUsers }} users)
      </h2>
      <div class="h-64 rounded-lg border border-brand-slate-200 bg-white p-4">
        <AdminChart type="bar" :data="adoptionChartData" />
      </div>
    </template>
  </section>
</template>
