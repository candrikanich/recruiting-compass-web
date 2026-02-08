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
        class="bg-white rounded-lg shadow p-12 text-center"
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
        <div class="bg-white rounded-lg shadow p-6">
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
                class="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm font-semibold"
              >
                ✓ Mark Attended
              </button>
              <button
                @click="openEditForm"
                class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold"
              >
                Edit
              </button>
              <button
                @click="deleteEvent"
                class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold"
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
                class="mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded hover:bg-green-200 transition"
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
          class="bg-white rounded-lg shadow p-6"
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
                  <CheckIcon class="w-3 h-3" />
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
        <div class="bg-white rounded-lg shadow p-6">
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
        <div class="bg-white rounded-lg shadow p-6">
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
                  class="w-4 h-4 rounded"
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

        <!-- Edit Event Modal -->
        <div
          v-if="showEditForm"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div
            class="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto"
          >
            <div
              class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between"
            >
              <h2 class="text-2xl font-bold text-gray-900">Edit Event</h2>
              <button
                @click="showEditForm = false"
                class="text-gray-600 hover:text-gray-900"
              >
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <form @submit.prevent="handleUpdateEvent" class="p-6 space-y-6">
              <!-- Event Name -->
              <div>
                <label
                  for="editName"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Event Name <span class="text-red-600">*</span>
                </label>
                <input
                  id="editName"
                  v-model="editFormData.name"
                  type="text"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Event Type -->
              <div>
                <label
                  for="editType"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Event Type <span class="text-red-600">*</span>
                </label>
                <select
                  id="editType"
                  v-model="editFormData.type"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  <option value="camp">Camp</option>
                  <option value="showcase">Showcase</option>
                  <option value="game">Game</option>
                  <option value="official_visit">Official Visit</option>
                  <option value="unofficial_visit">Unofficial Visit</option>
                </select>
              </div>

              <!-- Location -->
              <div>
                <label
                  for="editLocation"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Location
                </label>
                <input
                  id="editLocation"
                  v-model="editFormData.location"
                  type="text"
                  placeholder="e.g., University Stadium, City, State"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Dates -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    for="editStartDate"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Start Date <span class="text-red-600">*</span>
                  </label>
                  <input
                    id="editStartDate"
                    v-model="editFormData.start_date"
                    type="date"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    for="editEndDate"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    End Date
                  </label>
                  <input
                    id="editEndDate"
                    v-model="editFormData.end_date"
                    type="date"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <!-- Cost -->
              <div>
                <label
                  for="editCost"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Cost ($)
                </label>
                <input
                  id="editCost"
                  v-model.number="editFormData.cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Performance Notes -->
              <div>
                <label
                  for="editNotes"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Performance Notes
                </label>
                <textarea
                  id="editNotes"
                  v-model="editFormData.performance_notes"
                  rows="4"
                  placeholder="How did it go? Any highlights?"
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

      <!-- Quick Interaction Logging Modal -->
      <Teleport to="body">
        <div
          v-if="showQuickLogModal"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/50"
            @click="showQuickLogModal = false"
          ></div>
          <div
            class="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6"
          >
            <h3 class="text-xl font-bold text-slate-900 mb-2">
              Log Interactions
            </h3>
            <p class="text-sm text-slate-600 mb-6">
              Did you have any coaching interactions at {{ event?.name }}?
            </p>

            <form @submit.prevent="handleQuickLogInteraction" class="space-y-4">
              <!-- Type -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Interaction Type
                </label>
                <select
                  v-model="quickLogData.type"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in_person_visit">In-Person Meeting</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="game">Game Appearance</option>
                </select>
              </div>

              <!-- Direction -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Who initiated?
                </label>
                <select
                  v-model="quickLogData.direction"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="inbound">Coach contacted us</option>
                  <option value="outbound">We contacted coach</option>
                </select>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  What was discussed? <span class="text-red-600">*</span>
                </label>
                <textarea
                  v-model="quickLogData.content"
                  rows="3"
                  required
                  placeholder="Brief notes about the interaction..."
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <!-- Sentiment -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  How did it go?
                </label>
                <select
                  v-model="quickLogData.sentiment"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="very_positive">Very Positive</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-2">
                <button
                  type="submit"
                  class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
                >
                  Log Interaction
                </button>
                <button
                  type="button"
                  @click="showQuickLogModal = false"
                  class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Skip for Now
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEvents } from "~/composables/useEvents";
import { usePerformance } from "~/composables/usePerformance";
import { useCoaches } from "~/composables/useCoaches";
import { useInteractions } from "~/composables/useInteractions";
import { CheckIcon, XMarkIcon } from "@heroicons/vue/24/solid";
import ExportButton from "~/components/Performance/ExportButton.vue";
import ExportModal from "~/components/Performance/ExportModal.vue";
import { getRoleLabel } from "~/utils/coachLabels";
import type { Event, PerformanceMetric, Coach } from "~/types/models";
import type { Database } from "~/types/database";

type InteractionType = Database["public"]["Enums"]["interaction_type"];
type SentimentType = Database["public"]["Enums"]["interaction_sentiment"];

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

const { fetchEvent, deleteEvent: deleteEventAPI, updateEvent } = useEvents();
const { createMetric, deleteMetric: deleteMetricAPI } = usePerformance();
const { fetchCoaches } = useCoaches();
const { createInteraction } = useInteractions();

const event = ref<Event | null>(null);
const eventMetrics = ref<PerformanceMetric[]>([]);
const loading = ref(true);
const metricLoading = ref(false);
const error = ref<string | null>(null);
const showMetricForm = ref(false);
const showEditForm = ref(false);
const showExportModal = ref(false);
const isUpdating = ref(false);
const showAddCoach = ref(false);
const selectedCoachId = ref("");
const schoolCoaches = ref<Coach[]>([]);
const coachesAtEvent = ref<Coach[]>([]);
const showQuickLogModal = ref(false);
const quickLogData = reactive<{
  type: InteractionType;
  direction: "inbound" | "outbound";
  content: string;
  sentiment: SentimentType;
}>({
  type: "in_person_visit",
  direction: "inbound",
  content: "",
  sentiment: "positive",
});

const newMetric = reactive({
  metric_type: "",
  value: null as number | null,
  unit: "",
  notes: "",
  verified: false,
});

const editFormData = reactive({
  name: "",
  type: "",
  location: "",
  start_date: "",
  end_date: "",
  cost: 0,
  performance_notes: "",
});

const getEventTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    showcase: "Showcase",
    camp: "Camp",
    official_visit: "Official Visit",
    unofficial_visit: "Unofficial Visit",
    game: "Game",
  };
  return labels[type] || type;
};

const formatDateRange = (
  startDate: string,
  endDate?: string | null,
): string => {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const startStr = new Date(
    startYear,
    startMonth - 1,
    startDay,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!endDate || endDate === startDate) return startStr;
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const endStr = new Date(endYear, endMonth - 1, endDay).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  return `${startStr} - ${endStr}`;
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

const eventSchoolId = computed(() => event.value?.school_id);

const availableCoaches = computed(() => {
  const presentIds = event.value?.coaches_present || [];
  return schoolCoaches.value.filter((c) => !presentIds.includes(c.id));
});

const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    email: "Email",
    flyer: "Flyer",
    web_search: "Web Search",
    recommendation: "Recommendation",
    friend: "Friend",
    other: "Other",
  };
  return labels[source] || source;
};

const openDirections = () => {
  if (!event.value) return;
  let query = "";
  if (event.value.address) query += event.value.address;
  if (event.value.city) query += (query ? ", " : "") + event.value.city;
  if (event.value.state) query += (query ? ", " : "") + event.value.state;

  if (query.trim()) {
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://www.google.com/maps/search/${encodedQuery}`, "_blank");
  }
};

const loadCoaches = async () => {
  if (!eventSchoolId.value) return;

  try {
    await fetchCoaches(eventSchoolId.value);

    const presentIds = event.value?.coaches_present || [];
    const coaches = schoolCoaches.value;
    coachesAtEvent.value = coaches.filter((c: any) =>
      presentIds.includes(c.id),
    );
  } catch (err) {
    console.error("Failed to load coaches:", err);
  }
};

const addCoach = async () => {
  if (!selectedCoachId.value || !event.value) return;

  try {
    const updatedCoaches = [
      ...(event.value.coaches_present || []),
      selectedCoachId.value,
    ];

    await updateEvent(eventId, {
      coaches_present: updatedCoaches,
    });

    showAddCoach.value = false;
    selectedCoachId.value = "";
    await loadCoaches();
  } catch (err) {
    console.error("Failed to add coach:", err);
  }
};

const removeCoach = async (coachId: string) => {
  if (!event.value) return;

  try {
    const updatedCoaches = (event.value.coaches_present || []).filter(
      (id) => id !== coachId,
    );

    await updateEvent(eventId, {
      coaches_present: updatedCoaches,
    });

    await loadCoaches();
  } catch (err) {
    console.error("Failed to remove coach:", err);
  }
};

const markAsAttended = async () => {
  if (!event.value) return;

  try {
    await updateEvent(eventId, { attended: true });
    event.value.attended = true;
    // Show quick interaction logging modal
    showQuickLogModal.value = true;
  } catch (err) {
    console.error("Failed to mark event as attended:", err);
  }
};

const handleQuickLogInteraction = async () => {
  if (!event.value || !event.value.school_id) return;

  try {
    const occurredAt = new Date(event.value.start_date).toISOString();

    await createInteraction({
      school_id: event.value.school_id,
      coach_id: null,
      event_id: eventId,
      type: quickLogData.type as InteractionType,
      direction: quickLogData.direction as "outbound" | "inbound",
      subject: `Interaction at ${event.value.name}`,
      content: quickLogData.content,
      sentiment: quickLogData.sentiment as SentimentType,
      occurred_at: occurredAt,
      logged_by: "", // Server will set from auth
      attachments: [],
    });

    // Reset and close modal
    quickLogData.type = "in_person_visit";
    quickLogData.direction = "inbound";
    quickLogData.content = "";
    quickLogData.sentiment = "positive";
    showQuickLogModal.value = false;
  } catch (err) {
    console.error("Failed to log interaction:", err);
    alert("Failed to log interaction. Please try again.");
  }
};

const handleAddMetric = async () => {
  try {
    metricLoading.value = true;
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
      recorded_date: event.value!.start_date,
      unit: newMetric.unit || "unit",
      notes: newMetric.notes || null,
      verified: newMetric.verified,
      event_id: eventId,
    });

    // Reset form
    newMetric.metric_type = "";
    newMetric.value = null;
    newMetric.unit = "";
    newMetric.notes = "";
    newMetric.verified = false;
    showMetricForm.value = false;

    // Reload metrics
    await loadEventMetrics();
  } catch (err) {
    console.error("Failed to log metric:", err);
  } finally {
    metricLoading.value = false;
  }
};

const deleteMetric = async (metricId: string) => {
  if (confirm("Delete this metric?")) {
    try {
      await deleteMetricAPI(metricId);
      await loadEventMetrics();
    } catch (err) {
      console.error("Failed to delete metric:", err);
    }
  }
};

const deleteEvent = async () => {
  if (confirm("Delete this event?")) {
    try {
      await deleteEventAPI(eventId);
      await router.push("/events");
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }
};

const openEditForm = () => {
  if (event.value) {
    editFormData.name = event.value.name;
    editFormData.type = event.value.type;
    editFormData.location = event.value.location || "";
    editFormData.start_date = event.value.start_date.split("T")[0];
    editFormData.end_date = event.value.end_date
      ? event.value.end_date.split("T")[0]
      : "";
    editFormData.cost = event.value.cost || 0;
    editFormData.performance_notes = event.value.performance_notes || "";
    showEditForm.value = true;
  }
};

const handleUpdateEvent = async () => {
  if (!event.value) return;

  try {
    isUpdating.value = true;
    await updateEvent(eventId, {
      name: editFormData.name,
      type: editFormData.type as
        | "camp"
        | "showcase"
        | "official_visit"
        | "unofficial_visit"
        | "game",
      location: editFormData.location || null,
      start_date: editFormData.start_date,
      end_date: editFormData.end_date || null,
      cost:
        editFormData.cost && typeof editFormData.cost === "number"
          ? editFormData.cost
          : null,
      performance_notes: editFormData.performance_notes || null,
    });

    // Reload event data
    event.value = await fetchEvent(eventId);
    showEditForm.value = false;
  } catch (err) {
    console.error("Failed to update event:", err);
    error.value = err instanceof Error ? err.message : "Failed to update event";
  } finally {
    isUpdating.value = false;
  }
};

const loadEventMetrics = async () => {
  try {
    const { metrics, fetchMetrics } = usePerformance();
    await fetchMetrics({ eventId });
    eventMetrics.value = metrics.value.filter((m) => m.event_id === eventId);
  } catch (err) {
    console.error("Failed to load event metrics:", err);
  }
};

onMounted(async () => {
  // Redirect to create page if ID is invalid (e.g., "new")
  if (!isValidEventId(eventId)) {
    await router.push("/events/create");
    return;
  }

  try {
    loading.value = true;
    event.value = await fetchEvent(eventId);
    if (event.value) {
      await loadEventMetrics();
      await loadCoaches();
    } else {
      error.value = "Event not found";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load event";
    error.value = message;
  } finally {
    loading.value = false;
  }
});
</script>
