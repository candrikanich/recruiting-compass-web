<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useEvents } from '~/composables/useEvents';
import { usePerformance } from '~/composables/usePerformance';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'metric-created': [metric: any];
}>();

// Composables
const { events, loading: eventsLoading, fetchEvents } = useEvents();
const { createMetric } = usePerformance();

// Form state
const metricType = ref('');
const value = ref<number | null>(null);
const date = ref('');
const unit = ref('');
const eventId = ref<string | null>(null);
const verified = ref(false);
const notes = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

// Metric type options (per spec)
const metricTypes = [
  { value: 'velocity', label: 'Fastball Velocity (mph)' },
  { value: 'exit_velo', label: 'Exit Velocity (mph)' },
  { value: 'sixty_time', label: '60-Yard Dash (sec)' },
  { value: 'pop_time', label: 'Pop Time (sec)' },
  { value: 'batting_avg', label: 'Batting Average' },
  { value: 'era', label: 'ERA' },
  { value: 'strikeouts', label: 'Strikeouts' },
  { value: 'other', label: 'Other' },
] as const;

// Computed properties
const isFormValid = computed(() => {
  return metricType.value && value.value !== null && date.value;
});

const sortedEvents = computed(() => {
  return [...events.value].sort((a, b) => {
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });
});

const formatEventDate = (dateString: string): string => {
  // Use UTC to avoid timezone issues with date-only strings
  const date = new Date(dateString + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

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
  eventId.value = null;
  verified.value = false;
  notes.value = '';
  loading.value = false;
  error.value = null;
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;

  loading.value = true;
  error.value = null;

  try {
    const newMetric = await createMetric({
      metric_type: metricType.value,
      value: value.value!,
      recorded_date: date.value,
      unit: unit.value || null,
      event_id: eventId.value,
      verified: verified.value,
      notes: notes.value || null,
    });

    emit('metric-created', newMetric);
    handleClose();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save metric. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  date.value = new Date().toISOString().split('T')[0];
});

// Watch show prop to fetch events when modal opens
watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      await fetchEvents();
    }
  }
);
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
                  <option value="">Select Metric</option>
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

            <!-- Event Dropdown (full width) -->
            <div class="mb-4">
              <label for="event" class="block text-sm font-medium text-gray-700 mb-1">
                Event (Optional)
              </label>
              <select
                id="event"
                v-model="eventId"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option v-if="eventsLoading" value="">Loading events...</option>
                <option v-else-if="events.length === 0" value="">No events available</option>
                <template v-else>
                  <option :value="null">No event</option>
                  <option
                    v-for="event in sortedEvents"
                    :key="event.id"
                    :value="event.id"
                  >
                    {{ event.name }} - {{ formatEventDate(event.start_date) }}
                  </option>
                </template>
              </select>
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
