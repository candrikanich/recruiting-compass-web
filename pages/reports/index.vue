<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">
            Reports & Analytics
          </h1>
          <p class="text-slate-600">
            Generate comprehensive reports and export recruiting data
          </p>
        </div>
      </div>
    </div>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Main Content -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Generate Report Card -->
          <div
            class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h2 class="mb-4 text-lg font-semibold text-slate-900">
              Generate Report
            </h2>

            <div class="space-y-4">
              <!-- Quick Presets -->
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700"
                  >Quick Presets</label
                >
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    v-for="preset in datePresets"
                    :key="preset.label"
                    @click="applyPreset(preset)"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-slate-50"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <!-- Date Range -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700"
                    >From</label
                  >
                  <input
                    v-model="fromDate"
                    type="date"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700"
                    >To</label
                  >
                  <input
                    v-model="toDate"
                    type="date"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <!-- Generate Button -->
              <button
                @click="handleGenerateReport"
                :disabled="isGenerating || !fromDate || !toDate"
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2.5 font-medium text-white transition hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div
                  v-if="isGenerating"
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                ></div>
                <UIcon name="i-heroicons-chart-bar" v-else class="h-5 w-5" />
                {{ isGenerating ? "Generating..." : "Generate Report" }}
              </button>

              <!-- Error Message -->
              <div
                v-if="error"
                class="rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <p class="text-sm text-red-700">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Report Results -->
          <div
            v-if="currentReport"
            class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900">
                Report Summary
              </h2>
              <button
                @click="() => exportToCSV()"
                class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
                Export CSV
              </button>
            </div>

            <!-- Stats Grid -->
            <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div class="rounded-xl bg-slate-50 p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"
                  >
                    <UIcon
                      name="i-heroicons-building-library"
                      class="h-5 w-5 text-blue-600"
                    />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.schools?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Schools</p>
                  </div>
                </div>
              </div>
              <div class="rounded-xl bg-slate-50 p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100"
                  >
                    <UIcon
                      name="i-heroicons-user-group"
                      class="h-5 w-5 text-purple-600"
                    />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.coaches?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Coaches</p>
                  </div>
                </div>
              </div>
              <div class="rounded-xl bg-slate-50 p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"
                  >
                    <UIcon
                      name="i-heroicons-chat-bubble-left-right"
                      class="h-5 w-5 text-emerald-600"
                    />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.interactions?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Interactions</p>
                  </div>
                </div>
              </div>
              <div class="rounded-xl bg-slate-50 p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100"
                  >
                    <UIcon
                      name="i-heroicons-chart-bar"
                      class="h-5 w-5 text-amber-600"
                    />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.metrics?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Metrics</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Schools by Status -->
            <div
              v-if="currentReport.schools?.byStatus"
              class="border-t border-slate-200 pt-6"
            >
              <h3 class="mb-3 font-semibold text-slate-900">
                Schools by Status
              </h3>
              <div class="space-y-2">
                <div
                  v-for="(count, status) in currentReport.schools.byStatus"
                  :key="status"
                  class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                >
                  <span class="text-sm text-slate-700 capitalize">{{
                    status
                  }}</span>
                  <span class="font-semibold text-slate-900">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-4">
          <div class="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3
              class="mb-3 flex items-center gap-2 font-semibold text-blue-900"
            >
              <UIcon name="i-heroicons-document-text" class="h-5 w-5" />
              Report Includes
            </h3>
            <ul class="space-y-2 text-sm text-blue-800">
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-check" class="h-4 w-4 text-blue-600" />
                Schools by status and division
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-check" class="h-4 w-4 text-blue-600" />
                Coach statistics
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-check" class="h-4 w-4 text-blue-600" />
                Interaction metrics
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-check" class="h-4 w-4 text-blue-600" />
                Performance summaries
              </li>
            </ul>
          </div>

          <div
            class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <h3 class="mb-3 font-semibold text-slate-900">Export Options</h3>
            <p class="mb-4 text-sm text-slate-600">
              Generate reports and export data in various formats for sharing
              with coaches, advisors, or for your records.
            </p>
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <UIcon
                  name="i-heroicons-document-text"
                  class="h-4 w-4 text-slate-400"
                />
                <span>CSV for spreadsheets</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <UIcon
                  name="i-heroicons-document-text"
                  class="h-4 w-4 text-slate-400"
                />
                <span>PDF for printing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useReports } from "~/composables/useReports";
definePageMeta({ middleware: "auth" });

const { currentReport, isGenerating, error, generateReport, exportToCSV } =
  useReports();

const fromDate = ref("");
const toDate = ref("");

const datePresets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Year to date", days: 999 },
  { label: "Last year", days: 365 },
];

const applyPreset = (preset: { label: string; days: number }) => {
  const today = new Date();
  const daysAgo = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);

  fromDate.value = daysAgo.toISOString().split("T")[0];
  toDate.value = today.toISOString().split("T")[0];
};

const handleGenerateReport = async () => {
  if (!fromDate.value || !toDate.value) return;
  await generateReport(fromDate.value, toDate.value);
};

onMounted(() => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  fromDate.value = thirtyDaysAgo.toISOString().split("T")[0];
  toDate.value = today.toISOString().split("T")[0];
});
</script>
