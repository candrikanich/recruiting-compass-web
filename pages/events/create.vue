<template>
  <div class="min-h-screen bg-gray-50">

    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink to="/events" class="text-blue-600 hover:text-blue-700 font-semibold">
          ← Back to Events
        </NuxtLink>
      </div>

      <!-- Page Card -->
      <div class="bg-white rounded-lg shadow p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Add New Event</h1>

        <!-- Error summary -->
        <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" />

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-8">
          <!-- Event Info Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Event Info</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Event Type -->
              <div>
                <label for="type" class="block text-sm font-medium text-gray-700 mb-1">
                  Event Type <span class="text-red-600">*</span>
                </label>
                <select
                  id="type"
                  v-model="form.type"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="showcase">Showcase</option>
                  <option value="camp">Camp</option>
                  <option value="official_visit">Official Visit</option>
                  <option value="unofficial_visit">Unofficial Visit</option>
                  <option value="game">Game</option>
                </select>
              </div>

              <!-- Event Name -->
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                  Event Name <span class="text-red-600">*</span>
                </label>
                <input
                  id="name"
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="e.g., Spring Showcase 2026"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- School -->
              <div>
                <label for="schoolId" class="block text-sm font-medium text-gray-700 mb-1">
                  School
                </label>
                <select
                  id="schoolId"
                  v-model="form.school_id"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a school --</option>
                  <option v-for="school in schools" :key="school.id" :value="school.id">
                    {{ school.name }}
                  </option>
                  <option value="none">None</option>
                  <option value="other">Other (not listed)</option>
                  <option value="add_new">+ Add new school</option>
                </select>
              </div>

              <!-- Event Source -->
              <div>
                <label for="source" class="block text-sm font-medium text-gray-700 mb-1">
                  Event Source
                </label>
                <select
                  id="source"
                  v-model="form.event_source"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Source (Optional)</option>
                  <option value="email">Email</option>
                  <option value="flyer">Flyer</option>
                  <option value="web_search">Web Search</option>
                  <option value="recommendation">Recommendation</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <!-- Cost -->
              <div>
                <label for="cost" class="block text-sm font-medium text-gray-700 mb-1">
                  Cost ($)
                </label>
                <input
                  id="cost"
                  v-model.number="form.cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- URL -->
              <div>
                <label for="url" class="block text-sm font-medium text-gray-700 mb-1">
                  Event URL
                </label>
                <input
                  id="url"
                  v-model="form.url"
                  type="url"
                  placeholder="https://..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Date & Time Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Date & Time</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Start Date -->
              <div>
                <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span class="text-red-600">*</span>
                </label>
                <input
                  id="startDate"
                  v-model="form.start_date"
                  type="date"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Start Time -->
              <div>
                <label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  id="startTime"
                  v-model="form.start_time"
                  type="time"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- End Date -->
              <div>
                <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  id="endDate"
                  v-model="form.end_date"
                  type="date"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- End Time -->
              <div>
                <label for="endTime" class="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  id="endTime"
                  v-model="form.end_time"
                  type="time"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Check-in Time -->
              <div>
                <label for="checkinTime" class="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Time
                </label>
                <input
                  id="checkinTime"
                  v-model="form.checkin_time"
                  type="time"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Location Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Location</h2>
            <div class="grid grid-cols-1 gap-6">
              <!-- Address -->
              <div>
                <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  id="address"
                  v-model="form.address"
                  type="text"
                  placeholder="e.g., 123 Main St"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- City & State -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    id="city"
                    v-model="form.city"
                    type="text"
                    placeholder="e.g., Atlanta"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label for="state" class="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    id="state"
                    v-model="form.state"
                    type="text"
                    placeholder="e.g., GA"
                    maxlength="2"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <!-- Get Directions Button -->
              <div v-if="form.address || form.city" class="flex gap-2">
                <button
                  type="button"
                  @click="getDirections"
                  class="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                  🗺️ Get Directions
                </button>
              </div>
            </div>
          </div>

          <!-- Event Details Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Event Details</h2>
            <div class="space-y-6">
              <!-- Event Description -->
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                  Event Description
                </label>
                <textarea
                  id="description"
                  v-model="form.description"
                  rows="3"
                  placeholder="Details about the event..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Checkboxes -->
              <div class="flex gap-6">
                <label class="flex items-center">
                  <input v-model="form.registered" type="checkbox" class="w-4 h-4 rounded" />
                  <span class="ml-2 text-sm text-gray-700">Registered</span>
                </label>
                <label class="flex items-center">
                  <input v-model="form.attended" type="checkbox" class="w-4 h-4 rounded" />
                  <span class="ml-2 text-sm text-gray-700">Attended</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Performance Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Performance</h2>
            <!-- Performance Notes -->
            <div>
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                Performance Notes
              </label>
              <textarea
                id="notes"
                v-model="form.performance_notes"
                rows="4"
                placeholder="How did you perform? Any feedback from coaches?"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="loading || !form.type || !form.name || !form.start_date"
              class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {{ loading ? 'Creating...' : 'Create Event' }}
            </button>
            <NuxtLink
              to="/events"
              class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition text-center"
            >
              Cancel
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>

    <!-- "Other School" Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showOtherSchoolModal"
          class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          @click="showOtherSchoolModal = false"
        >
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full" @click.stop>
            <div class="p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">School Not Listed</h2>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  School Name
                </label>
                <input
                  v-model="otherSchoolName"
                  type="text"
                  placeholder="Enter school name..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div class="flex gap-3">
                <button
                  @click="handleOtherSchool"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Continue with this school
                </button>
                <button
                  @click="showOtherSchoolModal = false"
                  class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add New School Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showAddSchoolModal"
          class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          @click="showAddSchoolModal = false"
        >
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full" @click.stop>
            <div class="p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Add New School</h2>
              <form @submit.prevent="saveNewSchool" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    School Name <span class="text-red-600">*</span>
                  </label>
                  <input
                    v-model="newSchoolData.name"
                    type="text"
                    placeholder="School name..."
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    v-model="newSchoolData.location"
                    type="text"
                    placeholder="City, State..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div class="flex gap-3">
                  <button
                    type="submit"
                    :disabled="!newSchoolData.name"
                    class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Save School
                  </button>
                  <button
                    type="button"
                    @click="showAddSchoolModal = false"
                    class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import { useEvents } from '~/composables/useEvents'
import { useSchools } from '~/composables/useSchools'
import { useRouter } from 'vue-router'
import { useValidation } from '~/composables/useValidation'
import { eventSchema } from '~/utils/validation/schemas'
import FormErrorSummary from '~/components/Validation/FormErrorSummary.vue'

definePageMeta({
  middleware: 'auth',
})

const { createEvent, loading } = useEvents()
const { schools, fetchSchools, createSchool } = useSchools()
const router = useRouter()
const { errors, fieldErrors, clearErrors, hasErrors } = useValidation(eventSchema)

const form = reactive({
  type: '',
  name: '',
  school_id: '',
  location: '',
  address: '',
  city: '',
  state: '',
  start_date: '',
  start_time: '',
  end_date: '',
  end_time: '',
  checkin_time: '',
  url: '',
  description: '',
  event_source: '',
  cost: null as number | null,
  registered: false,
  attended: false,
  performance_notes: '',
})

// Modal state
const showOtherSchoolModal = ref(false)
const showAddSchoolModal = ref(false)
const otherSchoolName = ref('')
const newSchoolData = reactive({
  name: '',
  location: '',
})

// Watch for school dropdown changes to trigger modals
watch(() => form.school_id, (newValue) => {
  if (newValue === 'other') {
    showOtherSchoolModal.value = true
  } else if (newValue === 'add_new') {
    showAddSchoolModal.value = true
  }
})

// Watch for start date changes - default end date to same day
watch(() => form.start_date, (newValue) => {
  if (newValue && !form.end_date) {
    form.end_date = newValue
  }
})

// Watch for start time changes - default end time to 1 hour later
watch(() => form.start_time, (newValue) => {
  if (newValue && !form.end_time) {
    const [hours, minutes] = newValue.split(':')
    const endHour = (parseInt(hours) + 1) % 24
    form.end_time = `${String(endHour).padStart(2, '0')}:${minutes}`
  }
})

const handleOtherSchool = () => {
  if (otherSchoolName.value.trim()) {
    form.school_id = ''
    showOtherSchoolModal.value = false
    otherSchoolName.value = ''
  }
}

const getDirections = () => {
  let query = ''
  if (form.address) query += form.address
  if (form.city) query += (query ? ', ' : '') + form.city
  if (form.state) query += (query ? ', ' : '') + form.state

  if (query.trim()) {
    const encodedQuery = encodeURIComponent(query)
    window.open(`https://www.google.com/maps/search/${encodedQuery}`, '_blank')
  }
}

const saveNewSchool = async () => {
  if (!newSchoolData.name.trim()) return

  try {
    const createdSchool = await createSchool({
      name: newSchoolData.name,
      location: newSchoolData.location || null,
      division: null,
      conference: null,
      website: null,
      favicon_url: null,
      twitter_handle: null,
      instagram_handle: null,
      notes: null,
      status: 'researching',
      is_favorite: false,
      pros: [],
      cons: [],
      user_id: '',
    })

    form.school_id = createdSchool.id
    newSchoolData.name = ''
    newSchoolData.location = ''
    showAddSchoolModal.value = false

    // Refresh schools list
    await fetchSchools()
  } catch (err) {
    console.error('Failed to create school:', err)
  }
}

const handleSubmit = async () => {
  try {
    const newEvent = await createEvent({
      type: form.type as 'showcase' | 'camp' | 'official_visit' | 'unofficial_visit' | 'game',
      name: form.name,
      school_id: form.school_id === 'none' ? null : (form.school_id || null),
      location: form.location || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      start_date: form.start_date,
      start_time: form.start_time || null,
      end_date: form.end_date || null,
      end_time: form.end_time || null,
      checkin_time: form.checkin_time || null,
      url: form.url || null,
      description: form.description || null,
      event_source: (form.event_source || null) as 'email' | 'flyer' | 'web_search' | 'recommendation' | 'friend' | 'other' | null,
      cost: form.cost,
      registered: form.registered,
      attended: form.attended,
      performance_notes: form.performance_notes || null,
    })

    // Navigate to event detail page
    await router.push(`/events/${newEvent.id}`)
  } catch (err) {
    console.error('Failed to create event:', err)
  }
}

onMounted(async () => {
  await fetchSchools()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
