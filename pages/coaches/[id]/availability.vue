<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/coaches/${coachId}`"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Coach
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900">Availability Calendar</h1>
        <p class="text-gray-600 mt-2">{{ coachName }} - {{ schoolName }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading availability...</p>
      </div>

      <!-- Main Content -->
      <div v-if="!loading" class="space-y-8">
        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-gray-600 text-sm mb-2">Availability Status</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ availabilitySummary }}
            </p>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-gray-600 text-sm mb-2">Timezone</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ availability?.timezone }}
            </p>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-gray-600 text-sm mb-2">Next Available</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ nextAvailableText }}
            </p>
          </div>
        </div>

        <!-- Weekly Schedule -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Weekly Schedule</h2>
            <button
              @click="isEditingSchedule = !isEditingSchedule"
              class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              {{ isEditingSchedule ? "Done" : "Edit Schedule" }}
            </button>
          </div>

          <!-- View Mode -->
          <div v-if="!isEditingSchedule" class="space-y-3">
            <div
              v-for="day in DAYS"
              :key="day"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex-1">
                <p class="font-semibold text-gray-900 capitalize">{{ day }}</p>
              </div>

              <div
                v-if="getDayAvailability(day)?.available"
                class="text-center flex-1"
              >
                <span
                  class="inline-block px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-800"
                >
                  {{ getDayAvailability(day)?.start_time }} -
                  {{ getDayAvailability(day)?.end_time }}
                </span>
              </div>

              <div v-else class="text-center flex-1">
                <span
                  class="inline-block px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-600"
                >
                  Not Available
                </span>
              </div>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="space-y-4">
            <fieldset
              v-for="day in DAYS"
              :key="day"
              class="p-4 border border-gray-200 rounded-lg"
            >
              <legend class="sr-only">{{ day }} availability</legend>

              <div class="flex items-center gap-4 mb-3">
                <label class="flex items-center gap-2 flex-1">
                  <input
                    :id="`day-${day}-checkbox`"
                    type="checkbox"
                    :checked="getDayAvailability(day)?.available"
                    @change="toggleDayEdit(day)"
                    class="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                  />
                  <span class="font-semibold text-gray-900 capitalize">
                    {{ day }}
                  </span>
                </label>
              </div>

              <div
                v-if="getDayAvailability(day)?.available"
                class="flex items-center gap-4 ml-6"
              >
                <div>
                  <label
                    :for="`start-${day}`"
                    class="block text-sm text-gray-600 mb-1"
                  >
                    Start
                    <span class="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    :id="`start-${day}`"
                    type="time"
                    :value="getDayAvailability(day)?.start_time"
                    @input="updateDayTime(day, 'start_time', $event)"
                    required
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                  />
                </div>

                <div>
                  <label
                    :for="`end-${day}`"
                    class="block text-sm text-gray-600 mb-1"
                  >
                    End
                    <span class="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    :id="`end-${day}`"
                    type="time"
                    :value="getDayAvailability(day)?.end_time"
                    @input="updateDayTime(day, 'end_time', $event)"
                    required
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                  />
                </div>
              </div>
            </fieldset>

            <!-- Save Button -->
            <button
              @click="saveSchedule"
              class="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Save Schedule
            </button>
          </div>
        </div>

        <!-- Blackout Dates -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Blackout Dates</h2>
            <button
              @click="showAddBlackoutDate = !showAddBlackoutDate"
              class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
            >
              + Add Blackout Date
            </button>
          </div>

          <!-- Add Blackout Date Form -->
          <div
            v-if="showAddBlackoutDate"
            class="mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <div class="flex items-end gap-4">
              <div class="flex-1">
                <label
                  for="blackout-date"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Date
                </label>
                <input
                  id="blackout-date"
                  v-model="newBlackoutDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div class="flex-1">
                <label
                  for="blackout-reason"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Reason (optional)
                </label>
                <input
                  id="blackout-reason"
                  v-model="blackoutReason"
                  type="text"
                  placeholder="e.g., Away, Vacation"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                @click="handleAddBlackoutDate"
                class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Add
              </button>

              <button
                @click="showAddBlackoutDate = false"
                class="px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Blackout Dates List -->
          <div v-if="availability?.blackout_dates?.length" class="space-y-2">
            <div
              v-for="(date, idx) in availability.blackout_dates"
              :key="idx"
              class="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div>
                <p class="font-medium text-red-900">
                  {{ formatBlackoutDate(date) }}
                </p>
              </div>

              <button
                @click="handleRemoveBlackoutDate(date)"
                class="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            <p>No blackout dates set</p>
          </div>
        </div>

        <!-- Mini Calendar Preview -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Next 30 Days</h2>

          <div class="grid grid-cols-7 gap-2">
            <!-- Day Headers -->
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Sun
            </div>
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Mon
            </div>
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Tue
            </div>
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Wed
            </div>
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Thu
            </div>
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Fri
            </div>
            <div class="text-center font-semibold text-gray-600 text-sm mb-2">
              Sat
            </div>

            <!-- Calendar Days -->
            <div
              v-for="(date, idx) in upcomingDays"
              :key="idx"
              :class="[
                'p-2 text-center rounded-lg text-sm font-medium transition',
                isBlackoutDate(date)
                  ? 'bg-red-100 text-red-800 line-through'
                  : isDayAvailable(date)
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ date.getDate() }}
            </div>
          </div>

          <!-- Legend -->
          <div class="mt-6 flex items-center gap-6">
            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded bg-green-100 border border-green-300"
              ></div>
              <p class="text-sm text-gray-600">Available</p>
            </div>

            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded bg-gray-100 border border-gray-300"
              ></div>
              <p class="text-sm text-gray-600">Not Available</p>
            </div>

            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded bg-red-100 border border-red-300"
              ></div>
              <p class="text-sm text-gray-600">Blackout Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useCoachAvailability } from "~/composables/useCoachAvailability";
import type { CoachAvailability, DayAvailability } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const coachId = route.params.id as string;

const { getCoach } = useCoaches();
const { getSchool } = useSchools();
const {
  getCoachAvailability,
  updateCoachAvailability,
  addBlackoutDate,
  removeBlackoutDate,
  getAvailabilitySummary,
  getNextAvailableSlot,
  DAYS,
} = useCoachAvailability();

const coachName = ref("");
const schoolName = ref("");
const loading = ref(false);
const isEditingSchedule = ref(false);
const showAddBlackoutDate = ref(false);
const newBlackoutDate = ref("");
const blackoutReason = ref("");

const availability = ref<CoachAvailability | null>(null);

const availabilitySummary = computed(() => {
  if (!availability.value) return "";
  return getAvailabilitySummary(coachId);
});

const nextAvailableText = computed(() => {
  const next = getNextAvailableSlot(coachId);
  if (!next) return "None";
  return next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
});

const upcomingDays = computed(() => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 35; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    days.push(date);
  }

  return days;
});

const getDayAvailability = (day: string): DayAvailability | null => {
  if (!availability.value) return null;
  const val = availability.value[day];
  if (typeof val === "object" && val !== null && "available" in val) {
    return val as DayAvailability;
  }
  return null;
};

const toggleDayEdit = (day: string) => {
  const dayData = getDayAvailability(day);
  if (dayData) {
    dayData.available = !dayData.available;
  }
};

const updateDayTime = (
  day: string,
  timeField: "start_time" | "end_time",
  event: Event,
) => {
  if (!availability.value) return;
  const input = event.target as HTMLInputElement;
  const key = day as keyof CoachAvailability;
  if (
    key in availability.value &&
    typeof availability.value[key] === "object"
  ) {
    const dayData = availability.value[key] as DayAvailability;
    dayData[timeField] = input.value;
  }
};

const saveSchedule = async () => {
  if (!availability.value) return;
  const success = await updateCoachAvailability(coachId, availability.value);
  if (success) {
    isEditingSchedule.value = false;
  }
};

const handleAddBlackoutDate = async () => {
  if (!newBlackoutDate.value) return;
  const success = await addBlackoutDate(coachId, newBlackoutDate.value);
  if (success) {
    availability.value = getCoachAvailability(coachId);
    newBlackoutDate.value = "";
    blackoutReason.value = "";
    showAddBlackoutDate.value = false;
  }
};

const handleRemoveBlackoutDate = async (date: string) => {
  const success = await removeBlackoutDate(coachId, date);
  if (success) {
    availability.value = getCoachAvailability(coachId);
  }
};

const isBlackoutDate = (date: Date): boolean => {
  if (!availability.value) return false;
  const dateStr = date.toISOString().split("T")[0];
  return availability.value.blackout_dates.includes(dateStr);
};

const isDayAvailable = (date: Date): boolean => {
  if (!availability.value || isBlackoutDate(date)) return false;
  const dayIndex = date.getDay();
  const dayName = DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
  const dayData = availability.value[dayName as keyof CoachAvailability] as
    | DayAvailability
    | undefined;
  return dayData?.available || false;
};

const formatBlackoutDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

onMounted(async () => {
  loading.value = true;
  try {
    const coach = await getCoach(coachId);
    if (coach) {
      coachName.value = `${coach.first_name} ${coach.last_name}`;
      availability.value = getCoachAvailability(coachId);

      if (coach.school_id) {
        const school = await getSchool(coach.school_id);
        if (school) {
          schoolName.value = school.name;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load availability:", err);
  } finally {
    loading.value = false;
  }
});
</script>
