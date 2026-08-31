<template>
  <div
    v-if="show && metric"
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
          @click="emit('close')"
          aria-label="Close edit metric"
          class="text-gray-600 hover:text-gray-900"
        >
          <UIcon name="i-heroicons-x-mark-solid" class="h-6 w-6" />
        </button>
      </div>

      <form @submit.prevent="emit('save')" class="space-y-6 p-6">
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
            v-model="metric.metric_type"
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
            v-model.number="metric.value"
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
            v-model="metric.recorded_date"
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
            v-model="metric.unit"
            type="text"
            placeholder="e.g., mph, sec, avg"
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Verified Checkbox -->
        <div class="flex items-center">
          <input
            v-model="metric.verified"
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
            v-model="metric.notes"
            rows="3"
            placeholder="Additional context or observations..."
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end gap-4">
          <button
            type="button"
            @click="emit('close')"
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
</template>

<script setup lang="ts">
import type { PerformanceMetric } from "~/types/models";

defineProps<{
  show: boolean;
  metricTypeOptions: { value: string; label: string }[];
  isUpdating: boolean;
}>();

const emit = defineEmits<{ save: []; close: [] }>();

// The editing metric is bound two-way so the form mutates the parent's draft copy
// (the parent already clones the row before opening, so this is a scratch object).
const metric = defineModel<PerformanceMetric | null>("metric", {
  required: true,
});
</script>
