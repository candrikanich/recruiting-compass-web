<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Sub-navigation tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="flex gap-6">
          <NuxtLink
            to="/performance"
            class="pb-3 px-1 border-b-2 border-blue-600 text-blue-600 font-semibold"
          >
            Performance Overview
          </NuxtLink>
          <NuxtLink
            to="/performance/timeline"
            class="pb-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 font-semibold"
          >
            Timeline & Analytics
          </NuxtLink>
        </nav>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Performance Metrics</h1>
          <p class="text-gray-600 mt-1">
            Track your athletic performance over time
          </p>
        </div>
        <div class="flex gap-4">
          <ExportButton
            v-if="metrics.length > 0"
            variant="full"
            @click="showExportModal = true"
          />
          <button
            @click="showLogMetricModal = true"
            class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            + Log Metric
          </button>
        </div>
      </div>

      <!-- Performance Dashboard (Analytics Overview) -->
      <div v-if="metrics.length > 0" class="mb-8">
        <PerformanceDashboard :metrics="metrics" />
      </div>

      <!-- Metric Charts -->
      <div
        v-if="metrics.length > 0"
        class="bg-white rounded-lg shadow p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Performance Trends</h2>
          <div
            v-if="availableMetricTypes.length > 1"
            class="flex gap-2 flex-wrap justify-end"
          >
            <button
              v-for="type in availableMetricTypes"
              :key="type"
              @click="selectedMetricType = type"
              :class="[
                'px-3 py-1 rounded text-sm font-semibold transition',
                selectedMetricType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
            >
              {{ getMetricLabel(type) }}
            </button>
          </div>
        </div>

        <!-- Chart or Empty State -->
        <div
          v-if="chartData && Object.keys(chartData.labels).length > 0"
          class="h-80"
        >
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div v-else class="text-center py-12 text-gray-500">
          <p>Not enough data to display chart (need at least 2 records)</p>
        </div>
      </div>

      <!-- Metric Trends -->
      <div
        v-if="metrics.length > 1"
        class="bg-white rounded-lg shadow p-6 mb-8"
      >
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Metric Trends</h2>
        <div v-if="metricTrends.length > 0" class="space-y-6">
          <div
            v-for="trend in metricTrends"
            :key="trend.type"
            class="border-b border-gray-200 pb-6 last:border-b-0"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-900">
                {{ getMetricLabel(trend.type) }}
              </h3>
              <span
                :class="[
                  'text-sm font-semibold px-2 py-1 rounded',
                  trend.trend === 'improving'
                    ? 'bg-green-100 text-green-800'
                    : trend.trend === 'declining'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800',
                ]"
              >
                {{
                  trend.trend === "improving"
                    ? "📈 Improving"
                    : trend.trend === "declining"
                      ? "📉 Declining"
                      : "➡️ Stable"
                }}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-3">
              Last {{ trend.count }} records: {{ trend.min }} to {{ trend.max }}
              {{ trend.unit }}
              <span v-if="trend.average" class="text-gray-700">
                (avg: {{ trend.average }})</span
              >
            </p>
            <!-- Simple bar chart -->
            <div class="flex items-end gap-1 h-24">
              <div
                v-for="(value, idx) in trend.values"
                :key="idx"
                class="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition"
                :style="{ height: `${(value / trend.max) * 100}%` }"
                :title="`${value}`"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Latest Metrics Summary -->
      <div
        v-if="metrics.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        <div
          v-for="(metric, key) in latestMetricsByType"
          :key="key"
          class="bg-white rounded-lg shadow p-6"
        >
          <p class="text-sm font-medium text-gray-600 mb-2">
            {{ getMetricLabel(key) }}
          </p>
          <div class="flex items-baseline gap-2">
            <p class="text-3xl font-bold text-blue-600">{{ metric.value }}</p>
            <p class="text-gray-500">{{ metric.unit }}</p>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            {{ formatDate(metric.recorded_date) }}
          </p>
          <div v-if="metric.verified" class="mt-2">
            <span
              class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
            >
              <CheckIcon class="w-3 h-3" />
              <span>Verified</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && metrics.length === 0" class="text-center py-12">
        <p class="text-gray-600">Loading metrics...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="metrics.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-2">No metrics logged yet</p>
        <p class="text-sm text-gray-500">
          Start tracking your performance to build a historical record
        </p>
      </div>

      <!-- Metrics Timeline -->
      <div v-else class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-6">
          Metric History
        </h2>
        <div
          v-for="metric in sortedMetrics"
          :key="metric.id"
          class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-lg font-bold text-gray-900">
                {{ getMetricLabel(metric.metric_type) }}
              </h3>
              <p class="text-sm text-gray-600">
                {{ formatDate(metric.recorded_date) }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="openEditForm(metric)"
                class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold"
              >
                Edit
              </button>
              <button
                @click="deleteMetric(metric.id)"
                class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p class="text-xs text-gray-600">Value</p>
              <p class="font-bold text-gray-900">
                {{ metric.value }} {{ metric.unit }}
              </p>
            </div>
            <div v-if="metric.verified">
              <p class="text-xs text-gray-600">Status</p>
              <p class="font-semibold text-green-600 flex items-center gap-1">
                <CheckIcon class="w-4 h-4" />
                <span>Verified</span>
              </p>
            </div>
          </div>

          <div v-if="metric.notes" class="border-t border-gray-200 pt-3">
            <p class="text-sm text-gray-700">{{ metric.notes }}</p>
          </div>
        </div>

        <!-- Edit Metric Modal -->
        <div
          v-if="showEditForm && editingMetric"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div
            class="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto"
          >
            <div
              class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between"
            >
              <h2 class="text-2xl font-bold text-gray-900">
                Edit Performance Metric
              </h2>
              <button
                @click="showEditForm = false"
                class="text-gray-600 hover:text-gray-900"
              >
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <form @submit.prevent="handleUpdateMetric" class="p-6 space-y-6">
              <!-- Metric Type -->
              <div>
                <label
                  for="editMetricType"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Metric Type <span class="text-red-600">*</span>
                </label>
                <select
                  id="editMetricType"
                  v-model="editingMetric.metric_type"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Metric</option>
                  <option value="velocity">Fastball Velocity (mph)</option>
                  <option value="exit_velo">Exit Velocity (mph)</option>
                  <option value="sixty_time">60-Yard Dash (sec)</option>
                  <option value="pop_time">Pop Time (sec)</option>
                  <option value="batting_avg">Batting Average</option>
                  <option value="era">ERA</option>
                  <option value="strikeouts">Strikeouts</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <!-- Value -->
              <div>
                <label
                  for="editValue"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Value <span class="text-red-600">*</span>
                </label>
                <input
                  id="editValue"
                  v-model.number="editingMetric.value"
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Recorded Date -->
              <div>
                <label
                  for="editRecordedDate"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date <span class="text-red-600">*</span>
                </label>
                <input
                  id="editRecordedDate"
                  v-model="editingMetric.recorded_date"
                  type="date"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Unit -->
              <div>
                <label
                  for="editUnit"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit
                </label>
                <input
                  id="editUnit"
                  v-model="editingMetric.unit"
                  type="text"
                  placeholder="e.g., mph, sec, avg"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Verified Checkbox -->
              <div class="flex items-center">
                <input
                  v-model="editingMetric.verified"
                  type="checkbox"
                  class="w-4 h-4 rounded"
                />
                <label class="ml-2 text-sm text-gray-700"
                  >Verified by third party</label
                >
              </div>

              <!-- Notes -->
              <div>
                <label
                  for="editNotes"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes
                </label>
                <textarea
                  id="editNotes"
                  v-model="editingMetric.notes"
                  rows="3"
                  placeholder="Additional context or observations..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Buttons -->
              <div class="flex gap-4 justify-end">
                <button
                  type="button"
                  @click="showEditForm = false"
                  class="px-6 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isUpdating"
                  class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {{ isUpdating ? "Saving..." : "Save Changes" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Export Modal -->
      <ExportModal
        v-if="showExportModal"
        :metrics="metrics"
        :events="[]"
        context="dashboard"
        @close="showExportModal = false"
      />

      <!-- Log Metric Modal -->
      <PerformanceLogMetricModal
        :show="showLogMetricModal"
        @close="showLogMetricModal = false"
        @metric-created="handleMetricCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  reactive,
  computed,
  defineAsyncComponent,
} from "vue";
import { usePerformance } from "~/composables/usePerformance";
import { CheckIcon, XMarkIcon } from "@heroicons/vue/24/solid";
import type { PerformanceMetric } from "~/types/models";
import { Line } from "vue-chartjs";
import Header from "~/components/Header.vue";
import ExportButton from "~/components/Performance/ExportButton.vue";
const ExportModal = defineAsyncComponent(
  () => import("~/components/Performance/ExportModal.vue"),
);
const PerformanceLogMetricModal = defineAsyncComponent(
  () => import("~/components/Performance/LogMetricModal.vue"),
);
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

definePageMeta({
  middleware: "auth",
});

const {
  metrics,
  latestMetrics,
  loading,
  fetchMetrics,
  createMetric,
  deleteMetric: deleteMetricAPI,
  updateMetric,
} = usePerformance();

const showAddForm = ref(false);
const showEditForm = ref(false);
const showExportModal = ref(false);
const showLogMetricModal = ref(false);
const isUpdating = ref(false);
const editingMetric = ref<PerformanceMetric | null>(null);
const selectedMetricType = ref("");

const newMetric = reactive({
  metric_type: "",
  value: null as number | null,
  recorded_date: new Date().toISOString().split("T")[0],
  unit: "",
  notes: "",
  verified: false,
});

const sortedMetrics = computed(() => {
  return [...metrics.value].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
});

const latestMetricsByType = computed(() => {
  const result: Record<string, PerformanceMetric> = {};
  const sorted = [...metrics.value].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
  sorted.forEach((m) => {
    if (!result[m.metric_type]) {
      result[m.metric_type] = m;
    }
  });
  return result;
});

const metricTrends = computed(() => {
  const typeGroups: Record<string, PerformanceMetric[]> = {};

  // Group metrics by type
  metrics.value.forEach((m) => {
    if (!typeGroups[m.metric_type]) {
      typeGroups[m.metric_type] = [];
    }
    typeGroups[m.metric_type].push(m);
  });

  // Calculate trends for each type
  return Object.entries(typeGroups)
    .filter(([_, records]) => records.length >= 2)
    .map(([type, records]) => {
      const sorted = [...records].sort(
        (a, b) =>
          new Date(a.recorded_date).getTime() -
          new Date(b.recorded_date).getTime(),
      );
      const values = sorted.map((m) => m.value).slice(-10); // Last 10 records
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(
        2,
      );

      // Determine trend (comparing first 3 to last 3)
      const first3 = values.slice(0, 3);
      const last3 = values.slice(-3);
      const firstAvg = first3.reduce((a, b) => a + b, 0) / first3.length;
      const lastAvg = last3.reduce((a, b) => a + b, 0) / last3.length;

      // For metrics like 60-time, ERA, lower is better; for velocity, exit velo, higher is better
      const lowerIsBetter = ["sixty_time", "pop_time", "era"].includes(type);
      let trend: "improving" | "declining" | "stable";

      if (lowerIsBetter) {
        if (lastAvg < firstAvg * 0.99) trend = "improving";
        else if (lastAvg > firstAvg * 1.01) trend = "declining";
        else trend = "stable";
      } else {
        if (lastAvg > firstAvg * 1.01) trend = "improving";
        else if (lastAvg < firstAvg * 0.99) trend = "declining";
        else trend = "stable";
      }

      return {
        type,
        values,
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        average: avg,
        unit: sorted[0].unit || "unit",
        count: values.length,
        trend,
      };
    });
});

const availableMetricTypes = computed(() => {
  const types = new Set(metrics.value.map((m) => m.metric_type));
  return Array.from(types);
});

const chartData = computed(() => {
  const type = selectedMetricType.value || availableMetricTypes.value[0];
  const filtered = metrics.value.filter((m) => m.metric_type === type);

  if (filtered.length < 2) return null;

  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime(),
  );

  return {
    labels: sorted.map((m) =>
      new Date(m.recorded_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    ),
    datasets: [
      {
        label: getMetricLabel(type),
        data: sorted.map((m) => m.value),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "top" as const,
      labels: {
        font: { size: 12 },
        padding: 15,
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      titleFont: { size: 14 },
      bodyFont: { size: 12 },
      borderColor: "#ddd",
      borderWidth: 1,
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      grid: {
        color: "#e5e7eb",
      },
      ticks: {
        font: { size: 11 },
      },
    },
    x: {
      grid: {
        color: "#f3f4f6",
      },
      ticks: {
        font: { size: 11 },
      },
    },
  },
};

const getMetricLabel = (type: string): string => {
  const labels: Record<string, string> = {
    velocity: "Fastball Velocity",
    exit_velo: "Exit Velocity",
    sixty_time: "60-Yard Dash",
    pop_time: "Pop Time",
    batting_avg: "Batting Average",
    era: "ERA",
    strikeouts: "Strikeouts",
    other: "Other Metric",
  };
  return labels[type] || type;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const handleAddMetric = async () => {
  try {
    await createMetric({
      metric_type: newMetric.metric_type as
        | "velocity"
        | "exit_velo"
        | "sixty_time"
        | "pop_time"
        | "batting_avg"
        | "era"
        | "strikeouts"
        | "other",
      value: newMetric.value!,
      recorded_date: newMetric.recorded_date,
      unit: newMetric.unit || "unit",
      notes: newMetric.notes || null,
      verified: newMetric.verified,
    });

    // Reset form
    newMetric.metric_type = "";
    newMetric.value = null;
    newMetric.recorded_date = new Date().toISOString().split("T")[0];
    newMetric.unit = "";
    newMetric.notes = "";
    newMetric.verified = false;
    showAddForm.value = false;

    await fetchMetrics();
  } catch (err) {
    console.error("Failed to log metric:", err);
  }
};

const handleMetricCreated = async () => {
  await fetchMetrics();
};

const deleteMetric = async (metricId: string) => {
  if (confirm("Are you sure you want to delete this metric?")) {
    try {
      await deleteMetricAPI(metricId);
    } catch (err) {
      console.error("Failed to delete metric:", err);
    }
  }
};

const openEditForm = (metric: PerformanceMetric) => {
  editingMetric.value = { ...metric };
  showEditForm.value = true;
};

const handleUpdateMetric = async () => {
  if (!editingMetric.value) return;

  try {
    isUpdating.value = true;
    await updateMetric(editingMetric.value.id, {
      metric_type: editingMetric.value.metric_type,
      value: editingMetric.value.value,
      recorded_date: editingMetric.value.recorded_date,
      unit: editingMetric.value.unit || "unit",
      notes: editingMetric.value.notes || null,
      verified: editingMetric.value.verified,
    });

    // Reload metrics
    await fetchMetrics();
    showEditForm.value = false;
    editingMetric.value = null;
  } catch (err) {
    console.error("Failed to update metric:", err);
  } finally {
    isUpdating.value = false;
  }
};

onMounted(async () => {
  await fetchMetrics();
});
</script>
