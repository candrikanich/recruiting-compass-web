<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'metric-created': [metric: any];
}>();

// Form state
const metricType = ref('');
const value = ref<number | null>(null);
const date = ref('');
const unit = ref('');
const verified = ref(false);
const notes = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

// Metric type options
const metricTypes = [
  { value: 'fastball_velocity', label: 'Fastball Velocity' },
  { value: 'exit_velocity', label: 'Exit Velocity' },
  { value: 'bat_speed', label: 'Bat Speed' },
  { value: 'sixty_yard_dash', label: '60-Yard Dash' },
  { value: 'pop_time', label: 'Pop Time' },
  { value: 'throw_velocity', label: 'Throw Velocity' },
  { value: 'vertical_jump', label: 'Vertical Jump' },
  { value: 'broad_jump', label: 'Broad Jump' },
] as const;

// Computed properties
const isFormValid = computed(() => {
  return metricType.value && value.value !== null && date.value;
});

// Methods
const handleClose = () => {
  resetForm();
  emit('close');
};

const resetForm = () => {
  metricType.value = '';
  value.value = null;
  date.value = '';
  unit.value = '';
  verified.value = false;
  notes.value = '';
  loading.value = false;
  error.value = null;
};

const handleSubmit = () => {
  console.log('Form submitted:', {
    metricType: metricType.value,
    value: value.value,
    date: date.value,
    unit: unit.value,
    verified: verified.value,
    notes: notes.value,
  });
  // Real implementation in Task 4
};

// Lifecycle
onMounted(() => {
  date.value = new Date().toISOString().split('T')[0];
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white">
          <h2 class="text-xl font-bold">Log Performance Metric</h2>
          <p class="mt-1 text-sm text-white/90">Record your athletic performance</p>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Error Display -->
          <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {{ error }}
          </div>

          <form @submit.prevent="handleSubmit">
            <!-- Form Fields Grid -->
            <div class="grid gap-4 md:grid-cols-2 mb-4">
              <!-- Row 1: Metric Type and Value -->
              <div>
                <label for="metricType" class="block text-sm font-medium text-gray-700 mb-1">
                  Metric Type <span class="text-red-500">*</span>
                </label>
                <select
                  id="metricType"
                  v-model="metricType"
                  required
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select metric type...</option>
                  <option
                    v-for="type in metricTypes"
                    :key="type.value"
                    :value="type.value"
                  >
                    {{ type.label }}
                  </option>
                </select>
              </div>

              <div>
                <label for="value" class="block text-sm font-medium text-gray-700 mb-1">
                  Value <span class="text-red-500">*</span>
                </label>
                <input
                  id="value"
                  v-model.number="value"
                  type="number"
                  step="0.01"
                  required
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter value"
                />
              </div>

              <!-- Row 2: Date and Unit -->
              <div>
                <label for="date" class="block text-sm font-medium text-gray-700 mb-1">
                  Date <span class="text-red-500">*</span>
                </label>
                <input
                  id="date"
                  v-model="date"
                  type="date"
                  required
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label for="unit" class="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  id="unit"
                  v-model="unit"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., mph, seconds, inches"
                />
              </div>
            </div>

            <!-- Verified Checkbox -->
            <div class="mb-4">
              <label class="flex items-center gap-2">
                <input
                  v-model="verified"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-medium text-gray-700">
                  Verified by third party
                </span>
              </label>
            </div>

            <!-- Notes Textarea -->
            <div class="mb-6">
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                v-model="notes"
                rows="3"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Additional context..."
              ></textarea>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="!isFormValid || loading"
                class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {{ loading ? 'Logging...' : 'Log Metric' }}
              </button>
              <button
                type="button"
                @click="handleClose"
                class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
