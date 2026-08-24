<template>
  <div
    v-if="show && metric"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
          @click="emit('close')"
          aria-label="Close edit metric"
          class="text-gray-600 hover:text-gray-900"
        >
          <UIcon name="i-heroicons-x-mark-solid" class="w-6 h-6" />
        </button>
      </div>

      <form @submit.prevent="emit('save')" class="p-6 space-y-6">
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
            v-model="metric.metric_type"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            class="block text-sm font-medium text-gray-700 mb-1"
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
            v-model="metric.recorded_date"
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
            v-model="metric.unit"
            type="text"
            placeholder="e.g., mph, sec, avg"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Verified Checkbox -->
        <div class="flex items-center">
          <input
            v-model="metric.verified"
            type="checkbox"
            class="w-4 h-4 rounded-sm"
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
            v-model="metric.notes"
            rows="3"
            placeholder="Additional context or observations..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Buttons -->
        <div class="flex gap-4 justify-end">
          <button
            type="button"
            @click="emit('close')"
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
