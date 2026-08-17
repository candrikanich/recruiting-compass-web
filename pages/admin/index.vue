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

      <!-- Jobs (cron) Section -->
      <div
        v-if="activeTab === 'jobs'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900">Scheduled Jobs</h2>
          <button
            @click="loadCronRuns"
            class="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        <div v-if="cronLoading" class="text-center py-12 text-slate-600">
          Loading job history...
        </div>
        <div
          v-else-if="cronError"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-800">{{ cronError }}</p>
        </div>
        <div v-else class="space-y-6">
          <!-- Per-job status cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="job in jobs"
              :key="job.jobName"
              class="rounded-lg border p-4"
              :class="cronCardClass(job)"
            >
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-3 h-3 rounded-full shrink-0"
                  :class="cronDotClass(job)"
                  aria-hidden="true"
                />
                <span class="font-semibold text-slate-900">{{
                  job.jobName
                }}</span>
                <span
                  v-if="job.stale"
                  class="ml-auto text-xs font-medium text-red-700 bg-red-100 rounded px-2 py-0.5"
                >
                  STALE
                </span>
                <span
                  v-else-if="job.neverRun"
                  class="ml-auto text-xs font-medium text-slate-500 bg-slate-100 rounded px-2 py-0.5"
                >
                  PENDING
                </span>
              </div>
              <dl class="mt-3 text-sm space-y-1 text-slate-600">
                <div class="flex justify-between gap-4">
                  <dt>Schedule</dt>
                  <dd class="font-mono text-slate-500">{{ job.schedule }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Last run</dt>
                  <dd>
                    <span :class="cronStatusText(job.lastRun?.status)">{{
                      job.lastRun?.status ?? "never"
                    }}</span>
                    <span v-if="job.lastRun" class="text-slate-400">
                      · {{ formatCronTime(job.lastRun.started_at) }}</span
                    >
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Last success</dt>
                  <dd>{{ formatCronTime(job.lastSuccessAt) }}</dd>
                </div>
                <div
                  v-if="job.lastRun?.rows_processed != null"
                  class="flex justify-between gap-4"
                >
                  <dt>Rows</dt>
                  <dd>
                    {{ job.lastRun.rows_processed }} processed<span
                      v-if="job.lastRun.rows_failed"
                      class="text-red-600"
                    >
                      · {{ job.lastRun.rows_failed }} failed</span
                    >
                  </dd>
                </div>
                <div
                  v-if="job.lastRun?.duration_ms != null"
                  class="flex justify-between gap-4"
                >
                  <dt>Duration</dt>
                  <dd>{{ formatDuration(job.lastRun.duration_ms) }}</dd>
                </div>
                <p
                  v-if="job.lastRun?.error"
                  class="text-red-700 bg-red-50 rounded p-2 mt-2 break-words"
                >
                  {{ job.lastRun.error }}
                </p>
              </dl>
            </div>
          </div>

          <!-- Recent runs -->
          <div>
            <h3 class="text-lg font-semibold text-slate-900 mb-3">
              Recent runs
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr
                    class="text-left text-slate-500 border-b border-slate-200"
                  >
                    <th class="py-2 pr-4 font-medium">Job</th>
                    <th class="py-2 pr-4 font-medium">Status</th>
                    <th class="py-2 pr-4 font-medium">Started</th>
                    <th class="py-2 pr-4 font-medium">Duration</th>
                    <th class="py-2 pr-4 font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="run in recent"
                    :key="run.id"
                    class="border-b border-slate-100"
                  >
                    <td class="py-2 pr-4 font-medium text-slate-800">
                      {{ run.job_name }}
                    </td>
                    <td class="py-2 pr-4">
                      <span :class="cronStatusText(run.status)">{{
                        run.status
                      }}</span>
                    </td>
                    <td class="py-2 pr-4 text-slate-500">
                      {{ formatCronTime(run.started_at) }}
                    </td>
                    <td class="py-2 pr-4 text-slate-500">
                      {{ formatDuration(run.duration_ms) }}
                    </td>
                    <td class="py-2 pr-4 text-slate-500">
                      <span v-if="run.rows_processed != null">{{
                        run.rows_processed
                      }}</span>
                      <span v-if="run.rows_failed" class="text-red-600">
                        ({{ run.rows_failed }} failed)</span
                      >
                    </td>
                  </tr>
                  <tr v-if="recent.length === 0">
                    <td colspan="5" class="py-6 text-center text-slate-500">
                      No runs recorded yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
import {
  useAdminCronRuns,
  type CronJobSummary,
} from "~/composables/useAdminCronRuns";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const { stats, statsLoading, statsError, loadStats } = useAdminStats();
const { jobs, recent, cronLoading, cronError, loadCronRuns } =
  useAdminCronRuns();

const tabs = computed(() => [
  { id: "overview", label: "Overview" },
  { id: "jobs", label: "Jobs" },
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

function formatCronTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function cronStatusText(status: string | undefined): string {
  switch (status) {
    case "success":
      return "text-green-700 font-medium";
    case "partial":
      return "text-amber-600 font-medium";
    case "error":
      return "text-red-700 font-medium";
    case "running":
      return "text-blue-600 font-medium";
    default:
      return "text-slate-500";
  }
}

function cronDotClass(job: CronJobSummary): string {
  if (job.stale || job.lastRun?.status === "error") return "bg-red-500";
  if (job.lastRun?.status === "partial") return "bg-amber-500";
  if (job.lastRun?.status === "running") return "bg-blue-500";
  if (job.lastRun?.status === "success") return "bg-green-500";
  return "bg-slate-300";
}

function cronCardClass(job: CronJobSummary): string {
  if (job.stale || job.lastRun?.status === "error")
    return "border-red-200 bg-red-50/40";
  if (job.lastRun?.status === "partial")
    return "border-amber-200 bg-amber-50/40";
  return "border-slate-200 bg-slate-50/40";
}

function selectTab(tabId: string) {
  activeTab.value = tabId;
  if (tabId === "overview") loadStats();
  else if (tabId === "jobs") loadCronRuns();
}

onMounted(async () => {
  if (activeTab.value === "overview") await loadStats();
});
</script>
