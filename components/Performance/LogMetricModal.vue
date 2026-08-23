<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useEvents } from "~/composables/useEvents";
import { usePerformance } from "~/composables/usePerformance";
import { formatMetricValue } from "~/utils/metricFormat";
import {
  metricTypesForSport,
  metricGroupsForSport,
  getMetricDef,
  customMetricKey,
  OTHER_KEY,
} from "~/utils/metrics/canonical";

interface Props {
  show: boolean;
  /** Athlete's primary sport — drives the sport-filtered metric-type list.
   *  Null/undefined falls back to the baseball vocabulary (no regression). */
  primarySport?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  "metric-created": [metric: any];
}>();

// Composables
const { events, loading: eventsLoading, fetchEvents } = useEvents();
const { createMetric } = usePerformance();

// Form state
const metricType = ref<string>("");
const value = ref<number | null>(null);
const date = ref("");
const unit = ref("");
const otherName = ref("");
const eventId = ref<string | null>(null);
const verified = ref(false);
const notes = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

// Refs for focus management
const firstInputRef = ref<HTMLElement | null>(null);

// Metric type options, ordered for the athlete's sport (registry-backed; "other" always last).
const metricTypes = computed(() =>
  metricTypesForSport(props.primarySport).map((key) => ({
    value: key,
    label: getMetricDef(key).label,
  })),
);

// Sectioned picker for the 6 metric-dense sports; null → flat picker (all
// other sports). Any offered key not in a group lands in a trailing "Other".
const metricGroupOptions = computed(() => {
  const groups = metricGroupsForSport(props.primarySport);
  if (groups.length === 0) return null;

  const grouped = groups.map((group) => ({
    category: group.category,
    options: group.keys.map((key) => ({
      value: key,
      label: getMetricDef(key).label,
    })),
  }));

  const groupedKeys = new Set(groups.flatMap((group) => group.keys));
  const leftover = metricTypes.value.filter((type) => !groupedKeys.has(type.value));
  if (leftover.length > 0) {
    grouped.push({ category: "Other", options: leftover });
  }
  return grouped;
});

// Canonical unit vocabulary — free picker, offered only for "other".
const unitOptions = [
  { value: "", label: "None" },
  { value: "mph", label: "mph" },
  { value: "sec", label: "sec" },
  { value: "in", label: "inches" },
  { value: "ft", label: "feet" },
  { value: "lbs", label: "lbs" },
  { value: "count", label: "count" },
  { value: "%", label: "%" },
] as const;

// Unit is locked to the registry's unit unless "other" is selected.
const unitLocked = computed(
  () => metricType.value !== "" && metricType.value !== OTHER_KEY,
);

// Value precision from the registry's format (decimal digits), 2 as a sane default.
const valueStep = computed(() => {
  if (!metricType.value || metricType.value === OTHER_KEY) return "0.01";
  const format = getMetricDef(metricType.value).format;
  if (format.kind === "decimal" || format.kind === "percent") {
    return `0.${"0".repeat(format.digits - 1)}1`;
  }
  return "1";
});

// The metric_type persisted on submit: the selected key, or the snake_cased
// custom name when "other" is chosen (mirrors iOS resolvedMetricKey).
const resolvedMetricKey = computed(() => {
  if (metricType.value !== OTHER_KEY) return metricType.value;
  return customMetricKey(otherName.value);
});

// Computed properties
const isFormValid = computed(() => {
  if (!metricType.value || value.value === null || !date.value) return false;
  if (metricType.value === OTHER_KEY) return otherName.value.trim().length > 0;
  return true;
});

const sortedEvents = computed(() => {
  return [...events.value].sort((a, b) => {
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });
});

const formatEventDate = (dateString: string): string => {
  // Use UTC to avoid timezone issues with date-only strings
  const date = new Date(dateString + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

// Methods
const handleClose = () => {
  resetForm();
  emit("close");
};

const resetForm = () => {
  metricType.value = "";
  value.value = null;
  date.value = "";
  unit.value = "";
  otherName.value = "";
  eventId.value = null;
  verified.value = false;
  notes.value = "";
  loading.value = false;
  error.value = null;
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;

  loading.value = true;
  error.value = null;

  try {
    const metricKey = resolvedMetricKey.value;
    const newMetric = await createMetric({
      metric_type: metricKey,
      value: value.value!,
      recorded_date: date.value,
      unit: unit.value || "",
      event_id: eventId.value,
      verified: verified.value,
      notes: notes.value || null,
      display_value: `${formatMetricValue(metricKey, value.value!)}${unit.value ? ` ${unit.value}` : ""}`,
    });

    emit("metric-created", newMetric);
    handleClose();
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Failed to save metric. Please try again.";
  } finally {
    loading.value = false;
  }
};

// Keyboard event handler
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    handleClose();
  }
};

// Lifecycle
onMounted(() => {
  date.value = new Date().toISOString().split("T")[0];
  // Add ESC key listener
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  // Clean up event listener
  document.removeEventListener("keydown", handleKeydown);
});

// Auto-set the registry's unit when metric type changes; reset the custom
// name whenever the selection moves away from "other".
watch(metricType, (newType) => {
  if (newType === "") {
    unit.value = "";
    otherName.value = "";
    return;
  }
  if (newType !== OTHER_KEY) {
    unit.value = getMetricDef(newType).unit;
    otherName.value = "";
  } else {
    unit.value = "";
  }
});

// Watch show prop to fetch events and manage focus
watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      await fetchEvents();
      // Focus first input after modal renders
      await nextTick();
      firstInputRef.value?.focus();
    }
  },
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
        aria-labelledby="modal-title"
        @click.stop
      >
        <!-- Header -->
        <div
          class="bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white"
        >
          <h2 id="modal-title" class="text-xl font-bold">
            Log Performance Metric
          </h2>
          <p class="mt-1 text-sm text-white/90">
            Record your athletic performance
          </p>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Error Display -->
          <div
            v-if="error"
            class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800"
          >
            {{ error }}
          </div>

          <form @submit.prevent="handleSubmit">
            <!-- Form Fields Grid -->
            <div class="grid gap-4 md:grid-cols-2 mb-4">
              <!-- Row 1: Metric Type and Value -->
              <div>
                <label
                  for="metricType"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Metric Type <span class="text-red-500">*</span>
                </label>
                <select
                  id="metricType"
                  ref="firstInputRef"
                  v-model="metricType"
                  required
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Metric</option>
                  <template v-if="metricGroupOptions">
                    <optgroup
                      v-for="group in metricGroupOptions"
                      :key="group.category"
                      :label="group.category"
                    >
                      <option
                        v-for="type in group.options"
                        :key="type.value"
                        :value="type.value"
                      >
                        {{ type.label }}
                      </option>
                    </optgroup>
                  </template>
                  <option
                    v-for="type in metricTypes"
                    v-else
                    :key="type.value"
                    :value="type.value"
                  >
                    {{ type.label }}
                  </option>
                </select>
              </div>

              <div>
                <label
                  for="value"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Value <span class="text-red-500">*</span>
                </label>
                <input
                  id="value"
                  v-model.number="value"
                  type="number"
                  :step="valueStep"
                  required
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter value"
                />
              </div>

              <!-- Row 2: Date and Unit -->
              <div>
                <label
                  for="date"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date <span class="text-red-500">*</span>
                </label>
                <input
                  id="date"
                  v-model="date"
                  type="date"
                  required
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  for="unit"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit
                </label>
                <select
                  id="unit"
                  v-model="unit"
                  :disabled="unitLocked"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option
                    v-for="opt in unitOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Custom Metric Name (only for "Other") -->
            <div v-if="metricType === OTHER_KEY" class="mb-4">
              <label
                for="otherName"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Metric Name <span class="text-red-500">*</span>
              </label>
              <input
                id="otherName"
                v-model="otherName"
                type="text"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Arm Strength"
              />
            </div>

            <!-- Event Dropdown (full width) -->
            <div class="mb-4">
              <label
                for="event"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Event (Optional)
              </label>
              <select
                id="event"
                v-model="eventId"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option v-if="eventsLoading" value="">Loading events...</option>
                <option v-else-if="events.length === 0" value="">
                  No events available
                </option>
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
                  class="h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-medium text-gray-700">
                  Verified by third party
                </span>
              </label>
            </div>

            <!-- Notes Textarea -->
            <div class="mb-6">
              <label
                for="notes"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                v-model="notes"
                rows="3"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                {{ loading ? "Logging..." : "Log Metric" }}
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
