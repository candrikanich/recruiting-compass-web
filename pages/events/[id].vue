<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink
          to="/events"
          class="font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Events
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !event" class="py-12 text-center">
        <p class="text-gray-600">Loading event...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Event Not Found -->
      <div
        v-else-if="!event"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">Event not found</p>
        <NuxtLink
          to="/events"
          class="font-semibold text-blue-600 hover:text-blue-700"
        >
          Return to Events →
        </NuxtLink>
      </div>

      <!-- Event Detail -->
      <div v-else class="space-y-8">
        <!-- Event Header -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-start justify-between">
            <div>
              <div class="mb-2 flex items-center gap-3">
                <span
                  class="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"
                >
                  {{ getEventTypeLabel(event.type) }}
                </span>
                <h1 class="text-3xl font-bold text-gray-900">
                  {{ event.name }}
                </h1>
              </div>
              <p class="text-gray-600">
                {{ formatDateRange(event.start_date, event.end_date) }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!event.attended"
                @click="markAsAttended"
                class="rounded-sm bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 transition hover:bg-green-200"
              >
                ✓ Mark Attended
              </button>
              <button
                @click="openEditForm"
                class="rounded-sm bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                @click="deleteEvent"
                class="rounded-sm bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 transition hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Event Details Grid -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div v-if="event.start_time" class="text-sm">
              <p class="text-gray-600">🕐 Start Time</p>
              <p class="font-semibold text-gray-900">{{ event.start_time }}</p>
            </div>
            <div v-if="event.checkin_time" class="text-sm">
              <p class="text-gray-600">✔️ Check-in</p>
              <p class="font-semibold text-gray-900">
                {{ event.checkin_time }}
              </p>
            </div>
            <div v-if="event.cost" class="text-sm">
              <p class="text-gray-600">💰 Cost</p>
              <p class="font-semibold text-gray-900">
                ${{ event.cost.toFixed(2) }}
              </p>
            </div>
            <div v-if="event.event_source" class="text-sm">
              <p class="text-gray-600">📌 Source</p>
              <p class="font-semibold text-gray-900">
                {{ getSourceLabel(event.event_source) }}
              </p>
            </div>
            <div class="text-sm">
              <p class="text-gray-600">✅ Status</p>
              <p class="font-semibold text-gray-900">
                <span v-if="event.attended">Attended</span>
                <span v-else-if="event.registered">Registered</span>
                <span v-else>Not Registered</span>
              </p>
            </div>
          </div>

          <!-- Location Info -->
          <div
            v-if="event.address || event.city || event.location"
            class="mt-6 border-t border-gray-200 pt-6"
          >
            <h3 class="mb-3 font-semibold text-gray-900">📍 Location</h3>
            <div class="space-y-2 text-gray-700">
              <p v-if="event.address">{{ event.address }}</p>
              <p v-if="event.city || event.state">
                <span v-if="event.city">{{ event.city }}</span>
                <span v-if="event.city && event.state">, </span>
                <span v-if="event.state">{{ event.state }}</span>
              </p>
              <p v-if="event.location">{{ event.location }}</p>
              <button
                v-if="event.address || event.city"
                @click="openDirections"
                class="mt-2 rounded-sm bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 transition hover:bg-green-200"
              >
                🗺️ Get Directions
              </button>
            </div>
          </div>

          <!-- Event Description -->
          <div
            v-if="event.description"
            class="mt-6 border-t border-gray-200 pt-6"
          >
            <h3 class="mb-2 font-semibold text-gray-900">Event Description</h3>
            <p class="text-gray-700">{{ event.description }}</p>
          </div>

          <!-- Event URL -->
          <div v-if="event.url" class="mt-4">
            <h3 class="mb-2 font-semibold text-gray-900">Event Link</h3>
            <a
              :href="event.url"
              target="_blank"
              class="break-all text-blue-600 hover:text-blue-700"
            >
              {{ event.url }}
            </a>
          </div>

          <!-- Performance Notes -->
          <div
            v-if="event.performance_notes"
            class="mt-6 border-t border-gray-200 pt-6"
          >
            <h3 class="mb-2 font-semibold text-gray-900">Performance Notes</h3>
            <p class="text-gray-700">{{ event.performance_notes }}</p>
          </div>
        </div>

        <!-- Metrics Recorded at This Event -->
        <div
          v-if="eventMetrics.length > 0"
          class="rounded-lg bg-white p-6 shadow-sm"
        >
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-gray-900">
              Metrics Recorded at This Event
            </h2>
            <ExportButton variant="icon" @click="showExportModal = true" />
          </div>
          <div class="space-y-4">
            <div
              v-for="metric in eventMetrics"
              :key="metric.id"
              class="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div>
                <p class="font-semibold text-gray-900">
                  {{ getMetricLabel(metric.metric_type) }}
                </p>
                <p class="mt-1 text-2xl font-bold text-blue-600">
                  {{ metric.value }}
                  <span class="text-sm text-gray-600">{{ metric.unit }}</span>
                </p>
                <p
                  v-if="metric.verified"
                  class="mt-2 flex items-center gap-1 text-xs text-green-600"
                >
                  <UIcon name="i-heroicons-check-solid" class="h-3 w-3" />
                  <span>Verified by third party</span>
                </p>
              </div>
              <button
                @click="deleteMetric(metric.id)"
                class="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Coaches Present Section -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-gray-900">Coaches Present</h2>
            <button
              v-if="!showAddCoach && event?.school_id"
              @click="showAddCoach = true"
              class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              + Add Coach
            </button>
          </div>

          <!-- Add Coach Form -->
          <div v-if="showAddCoach" class="mb-6 rounded-lg bg-gray-50 p-4">
            <label class="mb-2 block text-sm font-medium text-gray-700">
              Select Coach
            </label>
            <div class="flex flex-wrap gap-2">
              <select
                v-model="selectedCoachId"
                class="min-w-48 flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a coach...</option>
                <option
                  v-for="coach in availableCoaches"
                  :key="coach.id"
                  :value="coach.id"
                >
                  {{ coach.first_name }} {{ coach.last_name }} ({{
                    coach.role
                  }})
                </option>
              </select>
              <button
                @click="addCoach"
                :disabled="!selectedCoachId"
                class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                @click="
                  showAddCoach = false;
                  selectedCoachId = '';
                "
                class="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Coaches List -->
          <div
            v-if="coachesAtEvent.length > 0"
            class="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div
              v-for="coach in coachesAtEvent"
              :key="coach.id"
              class="rounded-lg border border-gray-200 p-4 transition hover:border-blue-300"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-2">
                    <h3 class="font-semibold text-gray-900">
                      {{ coach.first_name }} {{ coach.last_name }}
                    </h3>
                    <span
                      class="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                    >
                      {{ getRoleLabel(coach.role) }}
                    </span>
                  </div>
                  <div class="space-y-1 text-sm text-gray-600">
                    <p v-if="coach.email">📧 {{ coach.email }}</p>
                    <p v-if="coach.phone">📱 {{ coach.phone }}</p>
                  </div>
                </div>
                <button
                  @click="removeCoach(coach.id)"
                  class="ml-2 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="py-8 text-center text-gray-600">
            <p v-if="!event?.school_id">
              Event not associated with a school. Coaches can only be tracked
              for school-specific events.
            </p>
            <p v-else>No coaches recorded at this event yet.</p>
          </div>
        </div>

        <!-- Log Performance Metric -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-gray-900">
              Log Performance Metric
            </h2>
            <button
              v-if="!showMetricForm"
              @click="showMetricForm = true"
              class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              + Add Metric
            </button>
          </div>

          <form
            v-if="showMetricForm"
            @submit.prevent="handleAddMetric"
            class="space-y-6"
          >
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <!-- Metric Type -->
              <div>
                <label
                  for="metricType"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Metric Type <span class="text-red-600">*</span>
                </label>
                <select
                  id="metricType"
                  v-model="newMetric.metric_type"
                  required
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
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
                  for="value"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Value <span class="text-red-600">*</span>
                </label>
                <input
                  id="value"
                  v-model.number="newMetric.value"
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Unit -->
              <div>
                <label
                  for="unit"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Unit
                </label>
                <input
                  id="unit"
                  v-model="newMetric.unit"
                  type="text"
                  placeholder="e.g., mph, sec, m"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Verified Checkbox -->
              <div class="flex items-center">
                <input
                  v-model="newMetric.verified"
                  type="checkbox"
                  class="h-4 w-4 rounded-sm"
                />
                <label class="ml-2 text-sm text-gray-700"
                  >Verified by third party</label
                >
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label
                for="notes"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Notes
              </label>
              <textarea
                id="notes"
                v-model="newMetric.notes"
                rows="3"
                placeholder="Context or observations..."
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="
                  metricLoading ||
                  !newMetric.metric_type ||
                  newMetric.value === null
                "
                class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {{ metricLoading ? "Logging..." : "Log Metric" }}
              </button>
              <button
                type="button"
                @click="showMetricForm = false"
                class="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <EventEditModal
          :is-open="showEditForm"
          :form-data="editFormData"
          :is-updating="isUpdating"
          @submit="handleUpdateEvent"
          @cancel="showEditForm = false"
        />
      </div>

      <EventQuickLogModal
        :is-open="showQuickLogModal"
        :event-name="event?.name"
        :data="quickLogData"
        @submit="handleQuickLogInteraction"
        @close="showQuickLogModal = false"
      />

      <!-- Export Modal -->
      <ExportModal
        v-if="showExportModal"
        :metrics="eventMetrics"
        :events="event ? [event] : []"
        :eventId="eventId"
        context="event"
        @close="showExportModal = false"
      />
    </div>

    <DesignSystemConfirmDialog
      :is-open="isDeleteMetricDialogOpen"
      title="Delete Metric"
      message="Are you sure you want to delete this metric? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteMetric"
      @cancel="cancelDeleteMetric"
    />

    <DesignSystemConfirmDialog
      :is-open="isDeleteEventDialogOpen"
      title="Delete Event"
      message="Are you sure you want to delete this event? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteEvent"
      @cancel="cancelDeleteEvent"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { metricTypesForSport, getMetricDef } from "~/utils/metrics/canonical";
import ExportButton from "~/components/Performance/ExportButton.vue";
const ExportModal = defineAsyncComponent(
  () => import("~/components/Performance/ExportModal.vue"),
);
import EventEditModal from "~/components/Events/EventEditModal.vue";
import EventQuickLogModal from "~/components/Events/EventQuickLogModal.vue";
import { getRoleLabel } from "~/utils/coachLabels";
import { useEventDetail } from "~/composables/useEventDetail";
import { useEventCoaches } from "~/composables/useEventCoaches";
import { useEventMetricsSection } from "~/composables/useEventMetricsSection";
import { useEventQuickLog } from "~/composables/useEventQuickLog";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const eventId = route.params.id as string;

// Validate event ID - redirect to create if invalid
const isValidEventId = (id: string): boolean => {
  // UUID v4 format check
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
};

const {
  event,
  loading,
  error,
  showEditForm,
  isUpdating,
  editFormData,
  getEventTypeLabel,
  getSourceLabel,
  formatDateRange,
  openDirections,
  markAsAttended: markEventAttended,
  openEditForm,
  handleUpdateEvent,
  isDeleteEventDialogOpen,
  deleteEvent,
  confirmDeleteEvent,
  cancelDeleteEvent,
  load: loadEvent,
} = useEventDetail(eventId);

const {
  showAddCoach,
  selectedCoachId,
  coachesAtEvent,
  availableCoaches,
  loadCoaches,
  addCoach,
  removeCoach,
} = useEventCoaches(eventId, event);

const {
  eventMetrics,
  metricLoading,
  showMetricForm,
  showExportModal,
  newMetric,
  getMetricLabel,
  loadEventMetrics,
  handleAddMetric,
  isDeleteMetricDialogOpen,
  deleteMetric,
  confirmDeleteMetric,
  cancelDeleteMetric,
} = useEventMetricsSection(eventId, event);

const { showQuickLogModal, quickLogData, handleQuickLogInteraction } =
  useEventQuickLog(eventId, event);

// Metric-type dropdown options, ordered for the athlete's sport (registry-backed).
const { playerPrefs, getPlayerDetails } = usePreferenceManager();
const primarySport = ref<string | null>(null);
const metricTypeOptions = computed(() =>
  metricTypesForSport(primarySport.value).map((key) => {
    const def = getMetricDef(key);
    return {
      value: key,
      label: def.unit ? `${def.label} (${def.unit})` : def.label,
    };
  }),
);

const markAsAttended = () =>
  markEventAttended(() => {
    // Show quick interaction logging modal
    showQuickLogModal.value = true;
  });

onMounted(async () => {
  // Redirect to create page if ID is invalid (e.g., "new")
  if (!isValidEventId(eventId)) {
    await router.push("/events/create");
    return;
  }

  await loadEvent();
  if (event.value) {
    await loadEventMetrics();
    await loadCoaches();
  }
  await playerPrefs.loadPreferences();
  primarySport.value = getPlayerDetails()?.primary_sport ?? null;
});
</script>
