<template>
  <div class="min-h-screen bg-gray-50">

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink :to="`/schools/${schoolId}/coaches`" class="text-blue-600 hover:text-blue-700 font-semibold">
          ← Back to Coaches
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <p class="text-gray-600">Loading coach...</p>
      </div>

      <!-- Coach Detail -->
      <div v-if="!loading && coach">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Header Card -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h1 class="text-4xl font-bold text-gray-900">{{ coach.first_name }} {{ coach.last_name }}</h1>
                  <p class="text-lg text-gray-600 mt-2 capitalize">{{ getRoleLabel(coach.role) }}</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="inline-block px-3 py-1 text-sm font-semibold rounded bg-blue-100 text-blue-700">
                  {{ schoolName }}
                </span>
              </div>
            </div>

            <!-- Contact Information -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-gray-900">Contact Information</h2>
                <button
                  @click="editingContact = !editingContact"
                  class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded hover:bg-blue-200 transition"
                >
                  {{ editingContact ? 'Cancel' : 'Edit' }}
                </button>
              </div>

              <div v-if="editingContact" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    v-model="editedCoach.email"
                    type="email"
                    placeholder="coach@university.edu"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    v-model="editedCoach.phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    v-model="editedCoach.role"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="head">Head Coach</option>
                    <option value="assistant">Assistant Coach</option>
                    <option value="recruiting">Recruiting Coordinator</option>
                  </select>
                </div>
                <button
                  @click="saveCoach"
                  :disabled="loading"
                  class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {{ loading ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>

              <div v-else class="space-y-4">
                <div v-if="coach.email" class="flex items-start">
                  <span class="w-32 font-medium text-gray-700">Email:</span>
                  <a :href="`mailto:${coach.email}`" class="text-blue-600 hover:text-blue-700">
                    {{ coach.email }}
                  </a>
                </div>

                <div v-if="coach.phone" class="flex items-start">
                  <span class="w-32 font-medium text-gray-700">Phone:</span>
                  <a :href="`tel:${coach.phone}`" class="text-blue-600 hover:text-blue-700">
                    {{ coach.phone }}
                  </a>
                </div>

                <div v-if="!coach.email && !coach.phone" class="text-gray-500 text-sm">
                  No contact information added
                </div>
              </div>
            </div>

            <!-- Notes Section -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-gray-900">Notes</h2>
                <button
                  @click="editingNotes = !editingNotes"
                  class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded hover:bg-blue-200 transition"
                >
                  {{ editingNotes ? 'Cancel' : 'Edit' }}
                </button>
              </div>

              <div v-if="editingNotes">
                <textarea
                  v-model="editedNotes"
                  rows="6"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Add notes about this coach..."
                />
                <button
                  @click="saveNotes"
                  :disabled="loading"
                  class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {{ loading ? 'Saving...' : 'Save Notes' }}
                </button>
              </div>

              <div v-else class="text-gray-700 whitespace-pre-wrap">
                {{ coach.notes || 'No notes added yet.' }}
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-1 space-y-6">
            <!-- Quick Actions -->
            <div class="bg-white rounded-lg shadow p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div class="space-y-3">
                <a
                  v-if="coach.email"
                  :href="`mailto:${coach.email}`"
                  class="block w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-sm text-center"
                >
                  ✉️ Email
                </a>
                <a
                  v-if="coach.phone"
                  :href="`tel:${coach.phone}`"
                  class="block w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-sm text-center"
                >
                  ☎️ Call
                </a>
                <a
                  v-if="coach.phone"
                  :href="`sms:${coach.phone}`"
                  class="block w-full px-4 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition text-sm text-center"
                >
                  💬 Text
                </a>
              </div>
            </div>

            <!-- Responsiveness -->
            <div class="bg-white rounded-lg shadow p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Responsiveness</h3>
              <div class="text-center">
                <p class="text-4xl font-bold" :class="getResponsiveColor(coach.responsiveness_score)">
                  {{ Math.round(coach.responsiveness_score) }}%
                </p>
                <p class="text-sm text-gray-600 mt-2">Responsiveness Score</p>
                <p v-if="coach.last_contact_date" class="text-xs text-gray-500 mt-3">
                  Last contact: {{ formatDate(coach.last_contact_date) }}
                </p>
              </div>
            </div>

            <!-- Delete -->
            <div class="bg-white rounded-lg shadow p-6">
              <button
                @click="confirmDelete"
                class="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                Delete Coach
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Not Found -->
      <div v-if="!loading && !coach" class="bg-white rounded-lg shadow p-8 text-center">
        <p class="text-gray-600 mb-4">Coach not found</p>
        <NuxtLink :to="`/schools/${schoolId}/coaches`" class="text-blue-600 hover:text-blue-700 font-semibold">
          Back to Coaches
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabase } from '~/composables/useSupabase'
import { useSchools } from '~/composables/useSchools'
import type { Coach } from '~/types/models'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const supabase = useSupabase()
const { schools, fetchSchools } = useSchools()

const schoolId = route.params.schoolId as string
const coachId = route.params.coachId as string
const coach = ref<Coach | null>(null)
const loading = ref(false)
const editingContact = ref(false)
const editingNotes = ref(false)
const editedNotes = ref('')
const editedCoach = ref({
  email: '',
  phone: '',
  role: 'assistant' as const,
})

const schoolName = ref('')

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    head: 'Head Coach',
    assistant: 'Assistant Coach',
    recruiting: 'Recruiting Coordinator',
  }
  return labels[role] || role
}

const getResponsiveColor = (score: number): string => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const saveCoach = async () => {
  if (!coach.value) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('coaches')
      .update({
        email: editedCoach.value.email,
        phone: editedCoach.value.phone,
        role: editedCoach.value.role,
      })
      .eq('id', coachId)
      .select()
      .single()

    if (error) throw error
    if (data) {
      coach.value = data
      editingContact.value = false
    }
  } catch (err) {
    console.error('Failed to save coach:', err)
  } finally {
    loading.value = false
  }
}

const saveNotes = async () => {
  if (!coach.value) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('coaches')
      .update({ notes: editedNotes.value })
      .eq('id', coachId)
      .select()
      .single()

    if (error) throw error
    if (data) {
      coach.value = data
      editingNotes.value = false
    }
  } catch (err) {
    console.error('Failed to save notes:', err)
  } finally {
    loading.value = false
  }
}

const confirmDelete = async () => {
  if (confirm('Are you sure you want to delete this coach?')) {
    loading.value = true
    try {
      const { error } = await supabase.from('coaches').delete().eq('id', coachId)
      if (error) throw error
      await navigateTo(`/schools/${schoolId}/coaches`)
    } catch (err) {
      console.error('Failed to delete coach:', err)
    } finally {
      loading.value = false
    }
  }
}

onMounted(async () => {
  loading.value = true
  try {
    // Fetch schools to get school name
    await fetchSchools()
    const school = schools.value.find((s) => s.id === schoolId)
    if (school) schoolName.value = school.name

    // Fetch coach
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .single()

    if (error) throw error
    if (data) {
      coach.value = data
      editedNotes.value = data.notes || ''
      editedCoach.value = {
        email: data.email || '',
        phone: data.phone || '',
        role: data.role,
      }
    }
  } catch (err) {
    console.error('Failed to load coach:', err)
  } finally {
    loading.value = false
  }
})
</script>
