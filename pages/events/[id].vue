<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink
          to="/events"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Events
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !event" class="text-center py-12">
        <p class="text-gray-600">Loading event...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Event Not Found -->
      <div
        v-else-if="!event"
        class="bg-white rounded-lg shadow-sm p-12 text-center"
      >
        <p class="text-gray-600 mb-2">Event not found</p>
        <NuxtLink
          to="/events"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          Return to Events →
        </NuxtLink>
      </div>

      <!-- Event Detail -->
      <div v-else class="space-y-8">
        <!-- Event Header -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <span
                  class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full"
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
                class="px-3 py-1 bg-green-100 text-green-700 rounded-sm hover:bg-green-200 transition text-sm font-semibold"
              >
                ✓ Mark Attended
              </button>
              <button
                @click="openEditForm"
                class="px-3 py-1 bg-blue-100 text-blue-700 rounded-sm hover:bg-blue-200 transition text-sm font-semibold"
              >
                Edit
              </button>
              <button
                @click="deleteEvent"
                class="px-3 py-1 bg-red-100 text-red-700 rounded-sm hover:bg-red-200 transition text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Event Details Grid -->
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <h3 class="font-semibold text-gray-900 mb-3">📍 Location</h3>
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
                class="mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-sm hover:bg-green-200 transition"
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
            <h3 class="font-semibold text-gray-900 mb-2">Event Description</h3>
            <p class="text-gray-700">{{ event.description }}</p>
          </div>

          <!-- Event URL -->
          <div v-if="event.url" class="mt-4">
            <h3 class="font-semibold text-gray-900 mb-2">Event Link</h3>
            <a
              :href="event.url"
              target="_blank"
              class="text-blue-600 hover:text-blue-700 break-all"
            >
              {{ event.url }}
            </a>
          </div>

          <!-- Performance Notes -->
          <div
            v-if="event.performance_notes"
            class="mt-6 border-t border-gray-200 pt-6"
          >
            <h3 class="font-semibold text-gray-900 mb-2">Performance Notes</h3>
            <p class="text-gray-700">{{ event.performance_notes }}</p>
          </div>
        </div>

        <!-- Metrics Recorded at This Event -->
        <div
          v-if="eventMetrics.length > 0"
          class="bg-white rounded-lg shadow-sm p-6"
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">
              Metrics Recorded at This Event
            </h2>
            <ExportButton variant="icon" @click="showExportModal = true" />
          </div>
          <div class="space-y-4">
            <div
              v-for="metric in eventMetrics"
              :key="metric.id"
              class="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <p class="font-semibold text-gray-900">
                  {{ getMetricLabel(metric.metric_type) }}
                </p>
                <p class="text-2xl font-bold text-blue-600 mt-1">
                  {{ metric.value }}
                  <span class="text-gray-600 text-sm">{{ metric.unit }}</span>
                </p>
                <p
                  v-if="metric.verified"
                  class="text-xs text-green-600 mt-2 flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-check-solid" class="w-3 h-3" />
                  <span>Verified by third party</span>
                </p>
              </div>
              <button
                @click="deleteMetric(metric.id)"
                class="text-red-600 hover:text-red-700 text-sm font-semibold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Coaches Present Section -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Coaches Present</h2>
            <button
              v-if="!showAddCoach && event?.school_id"
              @click="showAddCoach = true"
              class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              + Add Coach
            </button>
          </div>

          <!-- Add Coach Form -->
          <div v-if="showAddCoach" class="mb-6 p-4 bg-gray-50 rounded-lg">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Coach
            </label>
            <div class="flex gap-2 flex-wrap">
              <select
                v-model="selectedCoachId"
                class="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Add
              </button>
              <button
                @click="
                  showAddCoach = false;
                  selectedCoachId = '';
                "
                class="px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Coaches List -->
          <div
            v-if="coachesAtEvent.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div
              v-for="coach in coachesAtEvent"
              :key="coach.id"
              class="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-gray-900">
                      {{ coach.first_name }} {{ coach.last_name }}
                    </h3>
                    <span
                      class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                    >
                      {{ getRoleLabel(coach.role) }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600 space-y-1">
                    <p v-if="coach.email">📧 {{ coach.email }}</p>
                    <p v-if="coach.phone">📱 {{ coach.phone }}</p>
                  </div>
                </div>
                <button
                  @click="removeCoach(coach.id)"
                  class="text-red-600 hover:text-red-700 text-sm font-semibold ml-2"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-8 text-gray-600">
            <p v-if="!event?.school_id">
              Event not associated with a school. Coaches can only be tracked
              for school-specific events.
            </p>
            <p v-else>No coaches recorded at this event yet.</p>
          </div>
        </div>

        <!-- Log Performance Metric -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">
              Log Performance Metric
            </h2>
            <button
              v-if="!showMetricForm"
              @click="showMetricForm = true"
              class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              + Add Metric
            </button>
          </div>

          <form
            v-if="showMetricForm"
            @submit.prevent="handleAddMetric"
            class="space-y-6"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Metric Type -->
              <div>
                <label
                  for="metricType"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Metric Type <span class="text-red-600">*</span>
                </label>
                <select
                  id="metricType"
                  v-model="newMetric.metric_type"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  for="value"
                  class="block text-sm font-medium text-gray-700 mb-1"
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
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Unit -->
              <div>
                <label
                  for="unit"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit
                </label>
                <input
                  id="unit"
                  v-model="newMetric.unit"
                  type="text"
                  placeholder="e.g., mph, sec, avg"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Verified Checkbox -->
              <div class="flex items-center">
                <input
                  v-model="newMetric.verified"
                  type="checkbox"
                  class="w-4 h-4 rounded-sm"
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
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                v-model="newMetric.notes"
                rows="3"
                placeholder="Context or observations..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ metricLoading ? "Logging..." : "Log Metric" }}
              </button>
              <button
                type="button"
                @click="showMetricForm = false"
                class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
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
import { onMounted, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
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
});
</script>
