<template>
  <div class="min-h-screen bg-slate-50">
    <Header />

    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink :to="`/schools/${id}`" class="text-indigo-600 hover:text-indigo-700 font-semibold">
          ← Back to {{ schoolName }}
        </NuxtLink>
      </div>

      <!-- Header with gradient -->
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-8 rounded-2xl shadow-lg mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">Coaches</h1>
            <p class="text-slate-300 mt-2">Manage coaches for {{ schoolName }}</p>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition shadow-lg"
          >
            {{ showAddForm ? 'Cancel' : '+ Add Coach' }}
          </button>
        </div>
      </div>

      <!-- Add Coach Form -->
      <div v-if="showAddForm" class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Add New Coach</h2>

        <form @submit.prevent="handleAddCoach" class="space-y-6">
          <!-- Role -->
          <div>
            <label for="role" class="block text-sm font-medium text-slate-700 mb-2">
              Role <span class="text-red-500">*</span>
            </label>
            <select
              id="role"
              v-model="newCoach.role"
              required
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50"
              :disabled="loading"
              :style="selectDropdownStyle"
            >
              <option value="">Select Role</option>
              <option value="head">Head Coach</option>
              <option value="assistant">Assistant Coach</option>
              <option value="recruiting">Recruiting Coordinator</option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- First Name -->
            <div>
              <label for="firstName" class="block text-sm font-medium text-slate-700 mb-2">
                First Name <span class="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                v-model="newCoach.first_name"
                type="text"
                required
                class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
                placeholder="e.g., John"
                :disabled="loading"
              />
            </div>

            <!-- Last Name -->
            <div>
              <label for="lastName" class="block text-sm font-medium text-slate-700 mb-2">
                Last Name <span class="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                v-model="newCoach.last_name"
                type="text"
                required
                class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
                placeholder="e.g., Smith"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              v-model="newCoach.email"
              type="email"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
              placeholder="john.smith@university.edu"
              :disabled="loading"
            />
          </div>

          <!-- Phone -->
          <div>
            <label for="phone" class="block text-sm font-medium text-slate-700 mb-2">
              Phone
            </label>
            <input
              id="phone"
              v-model="newCoach.phone"
              type="tel"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
              placeholder="(555) 123-4567"
              :disabled="loading"
            />
          </div>

          <!-- Social Media -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="twitter" class="block text-sm font-medium text-slate-700 mb-2">
                Twitter Handle
              </label>
              <input
                id="twitter"
                v-model="newCoach.twitter_handle"
                type="text"
                class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
                placeholder="@handle"
                :disabled="loading"
              />
            </div>

            <div>
              <label for="instagram" class="block text-sm font-medium text-slate-700 mb-2">
                Instagram Handle
              </label>
              <input
                id="instagram"
                v-model="newCoach.instagram_handle"
                type="text"
                class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
                placeholder="@handle"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label for="notes" class="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              v-model="newCoach.notes"
              rows="4"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400 disabled:opacity-50"
              placeholder="Any notes about this coach..."
              :disabled="loading"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              :disabled="loading || !newCoach.role || !newCoach.first_name || !newCoach.last_name"
              class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition disabled:opacity-50"
            >
              {{ loading ? 'Adding...' : 'Add Coach' }}
            </button>
            <button
              type="button"
              @click="showAddForm = false"
              class="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading && coaches.length === 0" class="text-center py-8">
        <p class="text-slate-600">Loading coaches...</p>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && coaches.length === 0" class="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p class="text-slate-600 mb-4 text-lg">No coaches added yet</p>
        <p class="text-slate-500">Start by clicking "+ Add Coach" to manage coaches for this school.</p>
      </div>

      <!-- Coaches List -->
      <div v-if="coaches.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="coach in coaches"
          :key="coach.id"
          class="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border border-slate-200"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">
                {{ coach.first_name }} {{ coach.last_name }}
              </h3>
              <p class="text-sm text-slate-600 capitalize">{{ roleLabel(coach.role) }}</p>
            </div>
            <button
              @click="deleteCoach(coach.id)"
              class="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>

          <div class="space-y-2 mb-4 text-sm">
            <div v-if="coach.email" class="flex items-start gap-2">
              <span class="font-medium text-slate-700 whitespace-nowrap">Email:</span>
              <a :href="`mailto:${coach.email}`" class="text-indigo-600 hover:text-indigo-700 break-all">
                {{ coach.email }}
              </a>
            </div>

            <div v-if="coach.phone" class="flex items-center gap-2">
              <span class="font-medium text-slate-700 whitespace-nowrap">Phone:</span>
              <a :href="`tel:${coach.phone}`" class="text-indigo-600 hover:text-indigo-700">
                {{ coach.phone }}
              </a>
            </div>

            <div v-if="coach.twitter_handle" class="flex items-center gap-2">
              <span class="font-medium text-slate-700 whitespace-nowrap">Twitter:</span>
              <a
                :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
                target="_blank"
                class="text-indigo-600 hover:text-indigo-700"
              >
                {{ coach.twitter_handle }}
              </a>
            </div>

            <div v-if="coach.instagram_handle" class="flex items-center gap-2">
              <span class="font-medium text-slate-700 whitespace-nowrap">Instagram:</span>
              <a
                :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
                target="_blank"
                class="text-indigo-600 hover:text-indigo-700"
              >
                {{ coach.instagram_handle }}
              </a>
            </div>

            <div v-if="coach.notes" class="pt-2 border-t border-slate-200 mt-2">
              <p class="text-slate-700">{{ coach.notes }}</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex gap-2 pt-4 border-t border-slate-200">
            <button
              v-if="coach.email"
              @click="sendEmail(coach)"
              class="flex-1 px-3 py-2 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-200 transition"
            >
              📧 Email
            </button>
            <button
              v-if="coach.phone"
              @click="sendText(coach)"
              class="flex-1 px-3 py-2 bg-green-100 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-200 transition"
            >
              💬 Text
            </button>
            <button
              v-if="coach.twitter_handle"
              @click="openTwitter(coach)"
              class="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-200 transition"
            >
              𝕏 Tweet
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCoaches } from '~/composables/useCoaches'
import { useSchools } from '~/composables/useSchools'

definePageMeta({
})

const route = useRoute()
const id = route.params.id as string

// Dropdown style for selects
const selectDropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 0.75rem center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '1.5em 1.5em',
  paddingRight: '2.5rem',
}))

const { coaches, loading, error, fetchCoaches, createCoach, deleteCoach: deleteCoachAPI } = useCoaches()
const { getSchool } = useSchools()

const showAddForm = ref(false)
const schoolName = ref('')

const newCoach = reactive({
  role: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  twitter_handle: '',
  instagram_handle: '',
  notes: '',
})

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    head: 'Head Coach',
    assistant: 'Assistant Coach',
    recruiting: 'Recruiting Coordinator',
  }
  return labels[role] || role
}

const handleAddCoach = async () => {
  try {
    await createCoach(id, {
      role: newCoach.role as 'head' | 'assistant' | 'recruiting',
      first_name: newCoach.first_name,
      last_name: newCoach.last_name,
      email: newCoach.email || null,
      phone: newCoach.phone || null,
      twitter_handle: newCoach.twitter_handle || null,
      instagram_handle: newCoach.instagram_handle || null,
      notes: newCoach.notes || null,
      responsiveness_score: 0,
      last_contact_date: null,
    })

    // Reset form
    newCoach.role = ''
    newCoach.first_name = ''
    newCoach.last_name = ''
    newCoach.email = ''
    newCoach.phone = ''
    newCoach.twitter_handle = ''
    newCoach.instagram_handle = ''
    newCoach.notes = ''
    showAddForm.value = false

    // Refresh list
    await fetchCoaches(id)
  } catch (err) {
    console.error('Failed to add coach:', err)
  }
}

const deleteCoach = async (coachId: string) => {
  if (confirm('Are you sure you want to delete this coach?')) {
    try {
      await deleteCoachAPI(coachId)
    } catch (err) {
      console.error('Failed to delete coach:', err)
    }
  }
}

const sendEmail = (coach: typeof coaches.value[0]) => {
  if (coach.email) {
    window.location.href = `mailto:${coach.email}`
  }
}

const sendText = (coach: typeof coaches.value[0]) => {
  if (coach.phone) {
    window.location.href = `sms:${coach.phone.replace(/\D/g, '')}`
  }
}

const openTwitter = (coach: typeof coaches.value[0]) => {
  if (coach.twitter_handle) {
    const handle = coach.twitter_handle.replace('@', '')
    window.open(`https://twitter.com/${handle}`, '_blank')
  }
}

onMounted(async () => {
  console.log('Coaches page mounted, school ID:', id)
  const school = await getSchool(id)
  console.log('School loaded:', school)
  if (school) {
    schoolName.value = school.name
  }
  console.log('Fetching coaches...')
  await fetchCoaches(id)
  console.log('Coaches loaded:', coaches.value)
})
</script>
