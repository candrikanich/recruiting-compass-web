<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <PageHeader
      title="Performance Metrics"
      description="Track your athletic performance over time"
    >
      <template #actions>
        <ExportButton
          v-if="metrics.length > 0"
          variant="full"
          @click="showExportModal = true"
        />
        <button
          @click="showLogMetricModal = true"
          class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          + Log Metric
        </button>
      </template>
    </PageHeader>

    <!-- Sub-navigation tabs -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <nav class="flex gap-6">
          <NuxtLink
            to="/performance"
            class="border-b-2 border-blue-600 px-1 pb-3 font-semibold text-blue-600"
          >
            Performance Overview
          </NuxtLink>
          <NuxtLink
            to="/performance/timeline"
            class="border-b-2 border-transparent px-1 pb-3 font-semibold text-gray-600 hover:text-gray-900"
          >
            Timeline & Analytics
          </NuxtLink>
        </nav>
      </div>
    </div>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Performance Dashboard (Analytics Overview) -->
      <div v-if="metrics.length > 0" class="mb-8">
        <PerformanceDashboard
          :metrics="metrics"
          :primary-sport="primarySport"
        />
      </div>

      <!-- Metric Charts -->
      <div
        v-if="metrics.length > 0"
        class="mb-8 rounded-lg bg-white p-6 shadow-sm"
      >
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">Performance Trends</h2>
          <div
            v-if="availableMetricTypes.length > 1"
            class="flex flex-wrap justify-end gap-2"
          >
            <button
              v-for="type in availableMetricTypes"
              :key="type"
              @click="selectedMetricType = type"
              :class="[
                'rounded-sm px-3 py-1 text-sm font-semibold transition',
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
        <div v-else class="py-12 text-center text-gray-500">
          <p>Not enough data to display chart (need at least 2 records)</p>
        </div>
      </div>

      <!-- Metric Trends -->
      <div
        v-if="metrics.length > 1"
        class="mb-8 rounded-lg bg-white p-6 shadow-sm"
      >
        <h2 class="mb-6 text-2xl font-bold text-gray-900">Metric Trends</h2>
        <div v-if="metricTrends.length > 0" class="space-y-6">
          <div
            v-for="trend in metricTrends"
            :key="trend.type"
            class="border-b border-gray-200 pb-6 last:border-b-0"
          >
            <div class="mb-3 flex items-center justify-between">
              <h3 class="font-semibold text-gray-900">
                {{ getMetricLabel(trend.type) }}
              </h3>
              <span
                :class="[
                  'rounded-sm px-2 py-1 text-sm font-semibold',
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
            <p class="mb-3 text-sm text-gray-600">
              Last {{ trend.count }} records:
              {{ formatMetricValue(trend.type, trend.min) }} to
              {{ formatMetricValue(trend.type, trend.max) }}
              {{ trend.unit }}
              <span v-if="trend.average" class="text-gray-700">
                (avg: {{ formatMetricValue(trend.type, trend.average) }})</span
              >
            </p>
            <!-- Simple bar chart -->
            <div class="flex h-24 items-end gap-1">
              <div
                v-for="(value, idx) in trend.values"
                :key="idx"
                class="flex-1 rounded-t bg-blue-500 transition hover:bg-blue-600"
                :style="{ height: `${(value / trend.max) * 100}%` }"
                :title="formatMetricValue(trend.type, value)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Latest Metrics Summary -->
      <div
        v-if="metrics.length > 0"
        class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="(metric, key) in latestMetricsByType"
          :key="key"
          class="rounded-lg bg-white p-6 shadow-sm"
        >
          <p class="mb-2 text-sm font-medium text-gray-600">
            {{ getMetricLabel(key) }}
          </p>
          <div class="flex items-baseline gap-2">
            <p class="text-3xl font-bold text-blue-600">
              {{ formatMetricValue(metric.metric_type, metric.value) }}
            </p>
            <p class="text-gray-500">{{ metric.unit }}</p>
          </div>
          <p class="mt-2 text-xs text-gray-500">
            {{ formatDate(metric.recorded_date) }}
          </p>
          <div v-if="metric.verified" class="mt-2">
            <span
              class="inline-flex items-center gap-1 rounded-sm bg-green-100 px-2 py-1 text-xs text-green-800"
            >
              <UIcon name="i-heroicons-check-solid" class="h-3 w-3" />
              <span>Verified</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && metrics.length === 0" class="py-12 text-center">
        <p class="text-gray-600">Loading metrics...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="metrics.length === 0"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">No metrics logged yet</p>
        <p class="text-sm text-gray-500">
          Start tracking your performance to build a historical record
        </p>
      </div>

      <!-- Metrics Timeline -->
      <div v-else class="space-y-4">
        <h2 class="mt-8 mb-6 text-2xl font-bold text-gray-900">
          Metric History
        </h2>
        <div
          v-for="metric in sortedMetrics"
          :key="metric.id"
          class="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-lg"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="text-lg font-bold text-gray-900">
                {{ getMetricLabel(metric.metric_type) }}
              </h3>
              <p class="text-sm text-gray-600">
                {{ formatDate(metric.recorded_date) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="togglePrimary(metric)"
                :disabled="primaryUpdatingId === metric.id"
                :aria-pressed="metric.is_primary ? 'true' : 'false'"
                :aria-label="
                  metric.is_primary
                    ? 'Remove as headline stat'
                    : 'Set as headline stat'
                "
                :title="
                  metric.is_primary
                    ? 'Headline stat — tap to clear'
                    : 'Set as headline stat'
                "
                class="rounded-sm p-1.5 transition hover:bg-amber-50 disabled:opacity-50"
              >
                <UIcon
                  :name="
                    metric.is_primary
                      ? 'i-heroicons-star-solid'
                      : 'i-heroicons-star'
                  "
                  class="h-5 w-5"
                  :class="
                    metric.is_primary ? 'text-amber-500' : 'text-gray-400'
                  "
                />
              </button>
              <button
                @click="openEditForm(metric)"
                class="rounded-sm bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                @click="deleteMetric(metric.id)"
                class="rounded-sm bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 transition hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>

          <div class="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p class="text-xs text-gray-600">Value</p>
              <p class="font-bold text-gray-900">
                {{ formatMetricValue(metric.metric_type, metric.value) }}
                {{ metric.unit }}
              </p>
            </div>
            <div v-if="metric.verified">
              <p class="text-xs text-gray-600">Status</p>
              <p class="flex items-center gap-1 font-semibold text-green-600">
                <UIcon name="i-heroicons-check-solid" class="h-4 w-4" />
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
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            class="max-h-screen w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg"
          >
            <div
              class="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6"
            >
              <h2 class="text-2xl font-bold text-gray-900">
                Edit Performance Metric
              </h2>
              <button
                @click="showEditForm = false"
                class="text-gray-600 hover:text-gray-900"
              >
                <UIcon name="i-heroicons-x-mark-solid" class="h-6 w-6" />
              </button>
            </div>

            <form @submit.prevent="handleUpdateMetric" class="space-y-6 p-6">
              <!-- Metric Type -->
              <div>
                <label
                  for="editMetricType"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Metric Type <span class="text-red-600">*</span>
                </label>
                <select
                  id="editMetricType"
                  v-model="editingMetric.metric_type"
                  required
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Metric</option>
                  <option
                    v-for="opt in metricTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <!-- Value -->
              <div>
                <label
                  for="editValue"
                  class="mb-1 block text-sm font-medium text-gray-700"
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
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Recorded Date -->
              <div>
                <label
                  for="editRecordedDate"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Date <span class="text-red-600">*</span>
                </label>
                <input
                  id="editRecordedDate"
                  v-model="editingMetric.recorded_date"
                  type="date"
                  required
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Unit -->
              <div>
                <label
                  for="editUnit"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Unit
                </label>
                <input
                  id="editUnit"
                  v-model="editingMetric.unit"
                  type="text"
                  placeholder="e.g., mph, sec, avg"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Verified Checkbox -->
              <div class="flex items-center">
                <input
                  v-model="editingMetric.verified"
                  type="checkbox"
                  class="h-4 w-4 rounded-sm"
                />
                <label class="ml-2 text-sm text-gray-700"
                  >Verified by third party</label
                >
              </div>

              <!-- Notes -->
              <div>
                <label
                  for="editNotes"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Notes
                </label>
                <textarea
                  id="editNotes"
                  v-model="editingMetric.notes"
                  rows="3"
                  placeholder="Additional context or observations..."
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Buttons -->
              <div class="flex justify-end gap-4">
                <button
                  type="button"
                  @click="showEditForm = false"
                  class="rounded-lg bg-gray-200 px-6 py-2 font-semibold text-gray-900 transition hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isUpdating"
                  class="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
        :primary-sport="primarySport"
        @close="showLogMetricModal = false"
        @metric-created="handleMetricCreated"
      />
    </main>

    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Metric"
      message="Are you sure you want to delete this metric? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteMetric"
      @cancel="cancelDeleteMetric"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, defineAsyncComponent } from "vue";
import { formatMetricValue } from "~/utils/metricFormat";
import { metricTypesForSport, getMetricDef } from "~/utils/metrics/canonical";
import { usePerformance } from "~/composables/usePerformance";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";
import type { PerformanceMetric } from "~/types/models";

const logger = createClientLogger("Performance");
import { Line } from "vue-chartjs";
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
  setPrimaryMetric,
  clearPrimaryMetric,
} = usePerformance();
const { showToast } = useAppToast();
const { playerPrefs, getPlayerDetails } = usePreferenceManager();

const showAddForm = ref(false);
const showEditForm = ref(false);
const showExportModal = ref(false);
const showLogMetricModal = ref(false);
const isUpdating = ref(false);
const editingMetric = ref<PerformanceMetric | null>(null);
const selectedMetricType = ref("");
const primarySport = ref<string | null>(null);

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
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      // Determine trend (comparing first 3 to last 3)
      const first3 = values.slice(0, 3);
      const last3 = values.slice(-3);
      const firstAvg = first3.reduce((a, b) => a + b, 0) / first3.length;
      const lastAvg = last3.reduce((a, b) => a + b, 0) / last3.length;

      // Direction ("lower is better") comes from the metric registry, per sport.
      const lowerIsBetter = getMetricDef(type).lowerIsBetter;
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
        borderColor: "#3b82f6", // audit-ignore — Chart.js config requires raw hex
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#3b82f6", // audit-ignore — Chart.js config requires raw hex
        pointBorderColor: "#fff", // audit-ignore — Chart.js config requires raw hex
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
      borderColor: "#ddd", // audit-ignore — Chart.js config requires raw hex
      borderWidth: 1,
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      grid: {
        color: "#e5e7eb", // audit-ignore — Chart.js config requires raw hex
      },
      ticks: {
        font: { size: 11 },
      },
    },
    x: {
      grid: {
        color: "#f3f4f6", // audit-ignore — Chart.js config requires raw hex
      },
      ticks: {
        font: { size: 11 },
      },
    },
  },
};

const getMetricLabel = (type: string): string => getMetricDef(type).label;

// Metric-type dropdown options, ordered for the athlete's sport (registry-backed).
const metricTypeOptions = computed(() =>
  metricTypesForSport(primarySport.value).map((key) => {
    const def = getMetricDef(key);
    return {
      value: key,
      label: def.unit ? `${def.label} (${def.unit})` : def.label,
    };
  }),
);

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
      // metric_type is a registry key (any of 17 sports), not a baseball union.
      metric_type: newMetric.metric_type,
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
    logger.error("Failed to log metric", err);
  }
};

const handleMetricCreated = async () => {
  await fetchMetrics();
};

const isDeleteDialogOpen = ref(false);
const metricToDeleteId = ref<string | null>(null);

const deleteMetric = (metricId: string) => {
  metricToDeleteId.value = metricId;
  isDeleteDialogOpen.value = true;
};

const confirmDeleteMetric = async () => {
  const metricId = metricToDeleteId.value;
  isDeleteDialogOpen.value = false;
  metricToDeleteId.value = null;
  if (!metricId) return;
  try {
    await deleteMetricAPI(metricId);
  } catch (err) {
    logger.error("Failed to delete metric", err);
    showToast(
      "Something went wrong deleting this metric. Please try again.",
      "error",
    );
  }
};

const cancelDeleteMetric = () => {
  isDeleteDialogOpen.value = false;
  metricToDeleteId.value = null;
};

const primaryUpdatingId = ref<string | null>(null);

const togglePrimary = async (metric: PerformanceMetric) => {
  if (primaryUpdatingId.value) return;
  primaryUpdatingId.value = metric.id;
  const wasPrimary = metric.is_primary;
  try {
    if (wasPrimary) {
      await clearPrimaryMetric(metric.id);
    } else {
      await setPrimaryMetric(metric.id);
    }
    await fetchMetrics();
    showToast(
      wasPrimary ? "Headline stat cleared" : "Headline stat updated",
      "success",
    );
  } catch (err) {
    logger.error("Failed to update headline stat", err);
    showToast(
      "Something went wrong updating your headline stat. Please try again.",
      "error",
    );
  } finally {
    primaryUpdatingId.value = null;
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
    logger.error("Failed to update metric", err);
  } finally {
    isUpdating.value = false;
  }
};

onMounted(async () => {
  await fetchMetrics();
  await playerPrefs.loadPreferences();
  primarySport.value = getPlayerDetails()?.primary_sport ?? null;
});
</script>
