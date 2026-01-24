<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Generate Report Card -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <h2 class="text-lg font-semibold text-slate-900 mb-4">
              Generate Report
            </h2>

            <div class="space-y-4">
              <!-- Quick Presets -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2"
                  >Quick Presets</label
                >
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    v-for="preset in datePresets"
                    :key="preset.label"
                    @click="applyPreset(preset)"
                    class="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <!-- Date Range -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >From</label
                  >
                  <input
                    v-model="fromDate"
                    type="date"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >To</label
                  >
                  <input
                    v-model="toDate"
                    type="date"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Generate Button -->
              <button
                @click="handleGenerateReport"
                :disabled="isGenerating || !fromDate || !toDate"
                class="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <div
                  v-if="isGenerating"
                  class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                ></div>
                <ChartBarIcon v-else class="w-5 h-5" />
                {{ isGenerating ? "Generating..." : "Generate Report" }}
              </button>

              <!-- Error Message -->
              <div
                v-if="error"
                class="bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <p class="text-sm text-red-700">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Report Results -->
          <div
            v-if="currentReport"
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-slate-900">
                Report Summary
              </h2>
              <button
                @click="() => exportToCSV()"
                class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
              >
                <ArrowDownTrayIcon class="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
                  >
                    <BuildingLibraryIcon class="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.schools?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Schools</p>
                  </div>
                </div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"
                  >
                    <UserGroupIcon class="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.coaches?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Coaches</p>
                  </div>
                </div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"
                  >
                    <ChatBubbleLeftRightIcon class="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.interactions?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Interactions</p>
                  </div>
                </div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"
                  >
                    <ChartBarIcon class="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.metrics?.total || 0 }}
                    </p>
                    <p class="text-sm text-slate-500">Metrics</p>
                  </div>
                </div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center"
                  >
                    <ArrowPathIcon class="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-slate-900">
                      {{ currentReport.coaches?.avgResponseRate || 0 }}%
                    </p>
                    <p class="text-sm text-slate-500">Response Rate</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Schools by Status -->
            <div
              v-if="currentReport.schools?.byStatus"
              class="pt-6 border-t border-slate-200"
            >
              <h3 class="font-semibold text-slate-900 mb-3">
                Schools by Status
              </h3>
              <div class="space-y-2">
                <div
                  v-for="(count, status) in currentReport.schools.byStatus"
                  :key="status"
                  class="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
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
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3
              class="font-semibold text-blue-900 mb-3 flex items-center gap-2"
            >
              <DocumentTextIcon class="w-5 h-5" />
              Report Includes
            </h3>
            <ul class="text-sm text-blue-800 space-y-2">
              <li class="flex items-center gap-2">
                <CheckIcon class="w-4 h-4 text-blue-600" />
                Schools by status and division
              </li>
              <li class="flex items-center gap-2">
                <CheckIcon class="w-4 h-4 text-blue-600" />
                Coach statistics
              </li>
              <li class="flex items-center gap-2">
                <CheckIcon class="w-4 h-4 text-blue-600" />
                Interaction metrics
              </li>
              <li class="flex items-center gap-2">
                <CheckIcon class="w-4 h-4 text-blue-600" />
                Performance summaries
              </li>
            </ul>
          </div>

          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
          >
            <h3 class="font-semibold text-slate-900 mb-3">Export Options</h3>
            <p class="text-sm text-slate-600 mb-4">
              Generate reports and export data in various formats for sharing
              with coaches, advisors, or for your records.
            </p>
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <DocumentTextIcon class="w-4 h-4 text-slate-400" />
                <span>CSV for spreadsheets</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <DocumentTextIcon class="w-4 h-4 text-slate-400" />
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
import Header from "~/components/Header.vue";
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CheckIcon,
} from "@heroicons/vue/24/outline";

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
