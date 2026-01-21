<template>
  <div class="min-h-screen bg-slate-50">

    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Form Container -->
      <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Gradient Header -->
        <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-8 py-6">
          <h1 class="text-2xl font-bold mb-1">Log Interaction</h1>
          <p class="text-indigo-100 text-sm">Record a new communication with a school or coach</p>
        </div>

        <!-- Form -->
        <div class="p-8">
        <!-- Error summary -->
        <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" />

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- School Selection -->
          <div>
            <label for="schoolId" class="block text-sm font-medium text-slate-700 mb-2">
              School <span class="text-red-500">*</span>
            </label>
            <select
              id="schoolId"
              v-model="form.school_id"
              required
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              :style="selectDropdownStyle"
            >
              <option value="">Select School</option>
              <option v-for="school in schools" :key="school.id" :value="school.id">
                {{ school.name }}
              </option>
            </select>
          </div>

          <!-- Coach Selection -->
          <div>
            <label for="coachId" class="block text-sm font-medium text-slate-700 mb-2">
              Coach (Optional)
            </label>
            <select
              id="coachId"
              :value="form.coach_id"
              @change="handleCoachSelectChange"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50"
              :disabled="!form.school_id"
              :style="selectDropdownStyle"
            >
              <option value="">-- Select a coach --</option>
              <option v-for="coach in schoolCoaches" :key="coach.id" :value="coach.id">
                {{ coach.first_name }} {{ coach.last_name }} ({{ getRoleLabel(coach.role) }})
              </option>
              <option v-if="schoolCoaches.length > 0" value="" disabled>---</option>
              <option v-if="schoolCoaches.length > 0" value="other">Other coach (not listed)</option>
              <option v-if="schoolCoaches.length > 0" value="add-new">+ Add new coach</option>
            </select>
          </div>

          <!-- Interaction Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-slate-700 mb-2">
              Type <span class="text-red-500">*</span>
            </label>
            <select
              id="type"
              v-model="form.type"
              required
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              :style="selectDropdownStyle"
            >
              <option value="">Select Type</option>
              <option value="email">📧 Email</option>
              <option value="text">💬 Text</option>
              <option value="phone_call">☎️ Phone Call</option>
              <option value="in_person_visit">👥 In-Person Visit</option>
              <option value="virtual_meeting">💻 Virtual Meeting</option>
              <option value="camp">⚾ Camp</option>
              <option value="showcase">🎯 Showcase</option>
              <option value="tweet">X (Twitter)</option>
              <option value="dm">💭 DM</option>
            </select>
          </div>

          <!-- Direction -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-3">
              Direction <span class="text-red-500">*</span>
            </label>
            <div class="flex gap-4">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  value="outbound"
                  v-model="form.direction"
                  class="w-5 h-5 text-indigo-600 border-2 border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
                <span class="text-slate-700 group-hover:text-indigo-600 transition-colors">Outbound (We initiated)</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  value="inbound"
                  v-model="form.direction"
                  class="w-5 h-5 text-indigo-600 border-2 border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
                <span class="text-slate-700 group-hover:text-indigo-600 transition-colors">Inbound (They initiated)</span>
              </label>
            </div>
          </div>

          <!-- Date/Time -->
          <div>
            <label for="occurredAt" class="block text-sm font-medium text-slate-700 mb-2">
              Date & Time <span class="text-red-500">*</span>
            </label>
            <input
              id="occurredAt"
              v-model="form.occurred_at"
              type="datetime-local"
              required
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Subject -->
          <div>
            <label for="subject" class="block text-sm font-medium text-slate-700 mb-2">
              Subject (Optional)
            </label>
            <input
              id="subject"
              v-model="form.subject"
              type="text"
              placeholder="Email subject, call topic, etc."
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
              @blur="validateSubject"
            />
            <FieldError :error="fieldErrors.subject" />
          </div>

          <!-- Content -->
          <div>
            <label for="content" class="block text-sm font-medium text-slate-700 mb-2">
              Content (Optional)
            </label>
            <textarea
              id="content"
              v-model="form.content"
              rows="4"
              placeholder="Details about the interaction..."
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400"
              @blur="validateContent"
            />
            <FieldError :error="fieldErrors.content" />
          </div>

          <!-- Sentiment -->
          <div>
            <label for="sentiment" class="block text-sm font-medium text-slate-700 mb-2">
              Sentiment (Optional)
            </label>
            <select
              id="sentiment"
              v-model="form.sentiment"
              class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              :style="selectDropdownStyle"
            >
              <option value="">No sentiment</option>
              <option value="very_positive">😄 Very Positive</option>
              <option value="positive">😊 Positive</option>
              <option value="neutral">😐 Neutral</option>
              <option value="negative">😕 Negative</option>
            </select>
          </div>

          <!-- Interest Calibration (for inbound/positive interactions) -->
          <div
            v-if="form.direction === 'inbound' && form.sentiment && ['positive', 'very_positive'].includes(form.sentiment)"
            class="bg-indigo-50 rounded-xl p-6 border-2 border-indigo-200"
          >
            <InterestCalibration ref="calibrationComponent" />
          </div>

          <!-- File Attachments -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Attachments (Optional)
            </label>
            <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
              <input
                ref="fileInput"
                type="file"
                multiple
                @change="handleFileSelect"
                class="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <div class="flex flex-col items-center gap-3">
                <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span class="text-lg">📎</span>
                </div>
                <div>
                  <button
                    type="button"
                    @click="fileInput?.click()"
                    class="text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    Choose Files
                  </button>
                  <p class="text-slate-500 text-sm mt-1">Images, PDFs, and documents supported</p>
                </div>
              </div>

              <!-- Selected Files -->
              <div v-if="selectedFiles.length > 0" class="mt-4 text-left">
                <p class="text-slate-600 text-sm font-medium mb-2">
                  {{ selectedFiles.length }} file(s) selected:
                </p>
                <ul class="space-y-1">
                  <li v-for="(file, idx) in selectedFiles" :key="idx" class="text-slate-600 text-sm truncate">
                    <button
                      type="button"
                      @click="removeFile(idx)"
                      class="text-red-600 hover:text-red-700 mr-2"
                    >
                      <XMarkIcon class="w-4 h-4 inline" />
                    </button>
                    {{ file.name }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              :disabled="loading || !form.school_id || !form.type || !form.direction || !form.occurred_at"
              class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition disabled:opacity-50"
            >
              {{ loading ? 'Logging...' : 'Log Interaction' }}
            </button>
            <button
              type="button"
              @click="$router.back()"
              class="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>

    <!-- Add New Coach Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showAddCoachModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="showAddCoachModal = false"
          ></div>
          <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full" @click.stop>
            <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-6 rounded-t-2xl">
              <h2 class="text-xl font-bold">Add New Coach</h2>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  v-model="coachFormData.first_name"
                  type="text"
                  class="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                  placeholder="e.g., John"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  v-model="coachFormData.last_name"
                  type="text"
                  class="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                  placeholder="e.g., Smith"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  v-model="coachFormData.role"
                  class="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="head">Head Coach</option>
                  <option value="assistant">Assistant Coach</option>
                  <option value="recruiting">Recruiting Coordinator</option>
                </select>
              </div>
              <div class="flex gap-3 pt-4">
                <button
                  @click="showAddCoachModal = false"
                  class="flex-1 px-4 py-2 text-slate-700 border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  @click="saveNewCoach(coachFormData)"
                  class="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition font-medium"
                >
                  Save Coach
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Other Coach Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showOtherCoachModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="showOtherCoachModal = false"
          ></div>
          <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full" @click.stop>
            <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-6 rounded-t-2xl">
              <h2 class="text-xl font-bold">Other Coach</h2>
            </div>
            <div class="p-6 space-y-4">
              <p class="text-sm text-slate-600">Enter the name of the coach (not currently in system)</p>
              <input
                v-model="otherCoachName"
                type="text"
                class="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                placeholder="Coach name"
              />
              <div class="flex gap-3 pt-4">
                <button
                  @click="showOtherCoachModal = false"
                  class="flex-1 px-4 py-2 text-slate-700 border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  @click="saveOtherCoach"
                  class="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import { useInteractions } from '~/composables/useInteractions'
import { useSchools } from '~/composables/useSchools'
import { useCoaches } from '~/composables/useCoaches'
import { useFormValidation } from '~/composables/useFormValidation'
import { interactionSchema } from '~/utils/validation/schemas'
import { z } from 'zod'
import FormErrorSummary from '~/components/Validation/FormErrorSummary.vue'
import FieldError from '~/components/Validation/FieldError.vue'
import InterestCalibration from '~/components/Interaction/InterestCalibration.vue'
import type { Interaction } from '~/types/models'

definePageMeta({
  middleware: 'auth',
})

// Dropdown style for selects
const selectDropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 0.75rem center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '1.5em 1.5em',
  paddingRight: '2.5rem',
}))

const { createInteraction, loading } = useInteractions()
const { schools, fetchSchools } = useSchools()
const { coaches, fetchAllCoaches, createCoach } = useCoaches()
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } = useFormValidation()

// Field validators
const validators = {
  subject: z.object({ subject: interactionSchema.shape.subject }),
  content: z.object({ content: interactionSchema.shape.content }),
}

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const showAddCoachModal = ref(false)
const showOtherCoachModal = ref(false)
const otherCoachName = ref('')
const calibrationComponent = ref<InstanceType<typeof InterestCalibration> | null>(null)
const coachFormData = ref({
  first_name: '',
  last_name: '',
  role: 'assistant' as 'head' | 'assistant' | 'recruiting',
})

const form = ref({
  school_id: '',
  coach_id: null as string | null,
  type: '',
  direction: 'outbound',
  occurred_at: new Date().toISOString().slice(0, 16),
  subject: '',
  content: '',
  sentiment: null as string | null,
  interest_level: null as 'low' | 'medium' | 'high' | null | 'not_set',
})

const schoolCoaches = computed(() => {
  if (!form.value.school_id) return []
  return coaches.value.filter((c) => c.school_id === form.value.school_id)
})

// Handle coach selection changes
const handleCoachSelect = (value: string | null) => {
  if (value === 'add-new') {
    coachFormData.value = { first_name: '', last_name: '', role: 'assistant' }
    showAddCoachModal.value = true
    form.value.coach_id = null
  } else if (value === 'other') {
    otherCoachName.value = ''
    showOtherCoachModal.value = true
    form.value.coach_id = null
  }
}

// Event handler for select element
const handleCoachSelectChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  const val = target.value
  form.value.coach_id = val || null
  handleCoachSelect(val || null)
}

const saveNewCoach = async (coachData: { first_name: string; last_name: string; role: string }) => {
  if (!form.value.school_id) return

  try {
    // Create coach using composable
    const newCoach = await createCoach(form.value.school_id, {
      first_name: coachData.first_name,
      last_name: coachData.last_name,
      role: coachData.role as 'head' | 'assistant' | 'recruiting',
      email: null,
      phone: null,
      twitter_handle: null,
      instagram_handle: null,
      notes: null,
      responsiveness_score: 0,
      last_contact_date: null,
    })

    // Set the newly created coach as selected
    form.value.coach_id = newCoach.id
    showAddCoachModal.value = false
  } catch (err) {
    console.error('Failed to create coach:', err)
  }
}

const saveOtherCoach = () => {
  if (!otherCoachName.value.trim()) return

  // Store the other coach name in a hidden field or note
  // For now, we'll just close the modal and keep coach_id as null
  // The coach name will be captured in the interaction content if needed
  form.value.coach_id = null
  showOtherCoachModal.value = false
  // Could add a note: form.value.content += `\n[Coach: ${otherCoachName.value}]`
  otherCoachName.value = ''
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    head: 'Head Coach',
    assistant: 'Assistant Coach',
    recruiting: 'Recruiting Coordinator',
  }
  return labels[role] || role
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    selectedFiles.value = Array.from(input.files)
  }
}

const removeFile = (idx: number) => {
  selectedFiles.value.splice(idx, 1)
}

const validateSubject = async () => {
  const validator = validateField('subject', validators.subject.shape.subject)
  await validator(form.value.subject)
}

const validateContent = async () => {
  const validator = validateField('content', validators.content.shape.content)
  await validator(form.value.content)
}

const handleSubmit = async () => {
  if (!form.value.school_id || !form.value.type || !form.value.direction || !form.value.occurred_at) {
    return
  }

  try {
    // Validate subject and content fields
    await validateSubject()
    await validateContent()

    // Check for validation errors
    if (hasErrors.value) {
      return
    }

    // Capture interest level from calibration component if available
    if (calibrationComponent.value) {
      form.value.interest_level = calibrationComponent.value.interestLevel as 'low' | 'medium' | 'high' | 'not_set'
    }

    // Build content with interest level if calibrated
    let finalContent = form.value.content
    if (form.value.interest_level && form.value.interest_level !== 'not_set') {
      const calibrationNote = `\n\n[Coach Interest Level: ${form.value.interest_level.toUpperCase()}]`
      finalContent = (finalContent || '') + calibrationNote
    }

    const interactionData: Omit<Interaction, 'id' | 'created_at'> = {
      school_id: form.value.school_id,
      coach_id: form.value.coach_id || null,
      type: form.value.type as Interaction['type'],
      direction: form.value.direction as Interaction['direction'],
      occurred_at: form.value.occurred_at,
      subject: form.value.subject || null,
      content: finalContent || null,
      sentiment: form.value.sentiment as Interaction['sentiment'],
      attachments: [], // Will be populated by createInteraction if files are uploaded
    }

    // Pass files to createInteraction for upload
    await createInteraction(interactionData, selectedFiles.value.length > 0 ? selectedFiles.value : undefined)

    // Reset form
    form.value = {
      school_id: '',
      coach_id: null,
      type: '',
      direction: 'outbound',
      occurred_at: new Date().toISOString().slice(0, 16),
      subject: '',
      content: '',
      sentiment: null,
      interest_level: null,
    }
    selectedFiles.value = []

    await navigateTo('/interactions')
  } catch (err) {
    console.error('Failed to log interaction:', err)
  }
}

onMounted(async () => {
  try {
    await fetchSchools()
    // Fetch all coaches (without school filter to get all coaches)
    await fetchAllCoaches()
  } catch (err) {
    console.error('Failed to load schools/coaches:', err)
  }
})
</script>
