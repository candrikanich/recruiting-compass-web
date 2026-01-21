<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Error summary -->
    <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" />

    <!-- Name -->
    <div>
      <label for="name" class="block text-sm font-medium mb-2 text-slate-700">
        School Name <span class="text-red-500">*</span>
        <span v-if="isAutoFilled('name')" class="text-xs font-normal text-blue-600">(auto-filled)</span>
      </label>
      <div v-if="useAutocomplete">
        <SchoolAutocomplete
          @select="handleCollegeSelect"
          :disabled="loading"
        />
      </div>
      <input
        v-else
        id="name"
        v-model="formData.name"
        type="text"
        required
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
        placeholder="e.g., University of Florida"
        :disabled="loading"
        @blur="validateName"
      />
      <DesignSystemFieldError :error="fieldErrors.name" />
    </div>

    <!-- Location -->
    <div>
      <label for="location" class="block text-sm font-medium mb-2 text-slate-700">
        Location
        <span v-if="isAutoFilled('location')" class="text-xs font-normal text-blue-600">(auto-filled)</span>
      </label>
      <input
        id="location"
        v-model="formData.location"
        type="text"
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
        placeholder="e.g., Gainesville, Florida"
        :disabled="loading"
        @blur="validateLocation"
      />
      <DesignSystemFieldError :error="fieldErrors.location" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Division -->
      <div>
        <label for="division" class="block text-sm font-medium mb-2 text-slate-700">
          Division
          <span v-if="isAutoFilled('division')" class="text-xs font-normal text-blue-600">(auto-filled)</span>
        </label>
        <select
          id="division"
          v-model="formData.division"
          class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50"
          :disabled="loading"
          @blur="validateDivision"
          :style="selectDropdownStyle"
        >
          <option value="">Select Division</option>
          <option value="D1">Division 1 (D1)</option>
          <option value="D2">Division 2 (D2)</option>
          <option value="D3">Division 3 (D3)</option>
        </select>
        <DesignSystemFieldError :error="fieldErrors.division" />
      </div>

      <!-- Conference -->
      <div>
        <label for="conference" class="block text-sm font-medium mb-2 text-slate-700">
          Conference
          <span v-if="isAutoFilled('conference')" class="text-xs font-normal text-blue-600">(auto-filled)</span>
        </label>
        <input
          id="conference"
          v-model="formData.conference"
          type="text"
          class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
          placeholder="e.g., SEC, ACC, Pac-12"
          :disabled="loading"
          @blur="validateConference"
        />
        <DesignSystemFieldError :error="fieldErrors.conference" />
      </div>
    </div>

    <!-- Website -->
    <div>
      <label for="website" class="block text-sm font-medium mb-2 text-slate-700">
        School Website
        <span v-if="isAutoFilled('website')" class="text-xs font-normal text-blue-600">(auto-filled)</span>
      </label>
      <input
        id="website"
        v-model="formData.website"
        type="text"
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
        placeholder="https://example.com or www.example.com"
        :disabled="loading"
        @blur="validateWebsite"
      />
      <DesignSystemFieldError :error="fieldErrors.website" />
    </div>

    <!-- Social Media -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="twitter" class="block text-sm font-medium mb-2 text-slate-700">
          Twitter Handle
        </label>
        <input
          id="twitter"
          v-model="formData.twitter_handle"
          type="text"
          class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
          placeholder="@handle"
          :disabled="loading"
          @blur="validateTwitter"
        />
        <DesignSystemFieldError :error="fieldErrors.twitter_handle" />
      </div>

      <div>
        <label for="instagram" class="block text-sm font-medium mb-2 text-slate-700">
          Instagram Handle
        </label>
        <input
          id="instagram"
          v-model="formData.instagram_handle"
          type="text"
          class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-50"
          placeholder="@handle"
          :disabled="loading"
          @blur="validateInstagram"
        />
        <DesignSystemFieldError :error="fieldErrors.instagram_handle" />
      </div>
    </div>

    <!-- Notes -->
    <div>
      <label for="notes" class="block text-sm font-medium mb-2 text-slate-700">
        Notes
      </label>
      <textarea
        id="notes"
        v-model="formData.notes"
        rows="4"
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400 disabled:opacity-50"
        placeholder="Any notes about this school..."
        :disabled="loading"
        @blur="validateNotes"
      />
      <DesignSystemFieldError :error="fieldErrors.notes" />
    </div>

    <!-- Status -->
    <div>
      <label for="status" class="block text-sm font-medium mb-2 text-slate-700">
        Initial Status
      </label>
      <select
        id="status"
        v-model="formData.status"
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50"
        :disabled="loading"
        @blur="validateStatus"
        :style="selectDropdownStyle"
      >
        <option value="researching">Researching</option>
        <option value="contacted">Contacted</option>
        <option value="interested">Interested</option>
        <option value="offer_received">Offer Received</option>
        <option value="declined">Declined</option>
        <option value="committed">Committed</option>
      </select>
      <DesignSystemFieldError :error="fieldErrors.status" />
    </div>

    <!-- College Scorecard Data (Display Only) -->
    <div v-if="collegeScorecardData" class="border-t border-slate-200 pt-6">
      <h3 class="text-sm font-semibold text-slate-900 mb-4">College Scorecard Data</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl text-sm">
        <div v-if="collegeScorecardData.studentSize">
          <p class="text-slate-600">Student Size</p>
          <p class="font-semibold text-slate-900">{{ collegeScorecardData.studentSize.toLocaleString() }}</p>
        </div>
        <div v-if="collegeScorecardData.carnegieSize">
          <p class="text-slate-600">Size Category</p>
          <p class="font-semibold text-slate-900">{{ collegeScorecardData.carnegieSize }}</p>
        </div>
        <div v-if="collegeScorecardData.enrollmentAll">
          <p class="text-slate-600">Total Enrollment</p>
          <p class="font-semibold text-slate-900">{{ collegeScorecardData.enrollmentAll.toLocaleString() }}</p>
        </div>
        <div v-if="collegeScorecardData.admissionRate">
          <p class="text-slate-600">Admission Rate</p>
          <p class="font-semibold text-slate-900">{{ (collegeScorecardData.admissionRate * 100).toFixed(1) }}%</p>
        </div>
        <div v-if="collegeScorecardData.studentFacultyRatio">
          <p class="text-slate-600">Student-Faculty Ratio</p>
          <p class="font-semibold text-slate-900">{{ collegeScorecardData.studentFacultyRatio }}:1</p>
        </div>
        <div v-if="collegeScorecardData.tuitionInState">
          <p class="text-slate-600">Tuition (In-State)</p>
          <p class="font-semibold text-slate-900">${{ collegeScorecardData.tuitionInState.toLocaleString() }}</p>
        </div>
        <div v-if="collegeScorecardData.tuitionOutOfState">
          <p class="text-slate-600">Tuition (Out-of-State)</p>
          <p class="font-semibold text-slate-900">${{ collegeScorecardData.tuitionOutOfState.toLocaleString() }}</p>
        </div>
        <div v-if="collegeScorecardData.latitude && collegeScorecardData.longitude">
          <p class="text-slate-600">Location</p>
          <p class="font-semibold text-green-700">Map coordinates available</p>
        </div>
      </div>
    </div>

    <!-- Submit and Cancel buttons -->
    <div class="flex gap-3 pt-4">
      <button
        type="submit"
        :disabled="loading || hasErrors || !formData.name"
        class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? 'Adding...' : 'Add School' }}
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { useValidation } from '~/composables/useValidation'
import { schoolSchema } from '~/utils/validation/schemas'
import { z } from 'zod'
import type { CollegeDataResult } from '~/composables/useCollegeData'

// Dropdown style for selects
const selectDropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 0.75rem center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '1.5em 1.5em',
  paddingRight: '2.5rem',
}))

const props = defineProps<{
  loading: boolean
  useAutocomplete?: boolean
  collegeScorecardData?: CollegeDataResult | null
  initialData?: {
    name?: string
    location?: string
    division?: string
    conference?: string
    website?: string
    twitter_handle?: string
    instagram_handle?: string
    notes?: string
    status?: string
  }
  initialAutoFilledFields?: {
    name?: boolean
    location?: boolean
    website?: boolean
    division?: boolean
    conference?: boolean
  }
}>()

const emit = defineEmits<{
  submit: [data: any]
  collegeSelect: [college: any]
  cancel: []
}>()

const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } = useValidation(schoolSchema)

// Form data - initialize with parent data or defaults
const formData = reactive({
  name: props.initialData?.name || '',
  location: props.initialData?.location || '',
  division: props.initialData?.division || '',
  conference: props.initialData?.conference || '',
  website: props.initialData?.website || '',
  twitter_handle: props.initialData?.twitter_handle || '',
  instagram_handle: props.initialData?.instagram_handle || '',
  notes: props.initialData?.notes || '',
  status: props.initialData?.status || 'researching',
})

const autoFilledFields = reactive({
  name: props.initialAutoFilledFields?.name || false,
  location: props.initialAutoFilledFields?.location || false,
  website: props.initialAutoFilledFields?.website || false,
  division: props.initialAutoFilledFields?.division || false,
  conference: props.initialAutoFilledFields?.conference || false,
})

// Watch for changes to initialData from parent (college selection)
watch(() => props.initialData, (newData) => {
  if (newData) {
    if (newData.name !== undefined) formData.name = newData.name
    if (newData.location !== undefined) formData.location = newData.location
    if (newData.division !== undefined) formData.division = newData.division
    if (newData.conference !== undefined) formData.conference = newData.conference
    if (newData.website !== undefined) formData.website = newData.website
  }
}, { deep: true })

// Watch for changes to autoFilledFields from parent
watch(() => props.initialAutoFilledFields, (newFields) => {
  if (newFields) {
    if (newFields.name !== undefined) autoFilledFields.name = newFields.name
    if (newFields.location !== undefined) autoFilledFields.location = newFields.location
    if (newFields.website !== undefined) autoFilledFields.website = newFields.website
    if (newFields.division !== undefined) autoFilledFields.division = newFields.division
    if (newFields.conference !== undefined) autoFilledFields.conference = newFields.conference
  }
}, { deep: true })

// Field validators
const validators = {
  name: z.object({ name: schoolSchema.shape.name }),
  location: z.object({ location: schoolSchema.shape.location }),
  division: z.object({ division: schoolSchema.shape.division }),
  conference: z.object({ conference: schoolSchema.shape.conference }),
  website: z.object({ website: schoolSchema.shape.website }),
  twitter_handle: z.object({ twitter_handle: schoolSchema.shape.twitter_handle }),
  instagram_handle: z.object({ instagram_handle: schoolSchema.shape.instagram_handle }),
  notes: z.object({ notes: schoolSchema.shape.notes }),
  status: z.object({ status: schoolSchema.shape.status }),
}

const validateName = async () => {
  const validator = validateField('name', validators.name.shape.name)
  await validator(formData.name)
}

const validateLocation = async () => {
  const validator = validateField('location', validators.location.shape.location)
  await validator(formData.location)
}

const validateDivision = async () => {
  const validator = validateField('division', validators.division.shape.division)
  await validator(formData.division)
}

const validateConference = async () => {
  const validator = validateField('conference', validators.conference.shape.conference)
  await validator(formData.conference)
}

const validateWebsite = async () => {
  const validator = validateField('website', validators.website.shape.website)
  await validator(formData.website)
}

const validateTwitter = async () => {
  const validator = validateField('twitter_handle', validators.twitter_handle.shape.twitter_handle)
  await validator(formData.twitter_handle)
}

const validateInstagram = async () => {
  const validator = validateField('instagram_handle', validators.instagram_handle.shape.instagram_handle)
  await validator(formData.instagram_handle)
}

const validateNotes = async () => {
  const validator = validateField('notes', validators.notes.shape.notes)
  await validator(formData.notes)
}

const validateStatus = async () => {
  const validator = validateField('status', validators.status.shape.status)
  await validator(formData.status)
}

const isAutoFilled = (field: string) => {
  return autoFilledFields[field as keyof typeof autoFilledFields]
}

const handleCollegeSelect = (college: any) => {
  formData.name = college.name
  formData.location = college.location || ''
  formData.website = college.website || ''

  autoFilledFields.name = true
  autoFilledFields.location = !!college.location
  autoFilledFields.website = !!college.website

  emit('collegeSelect', college)
}

const handleSubmit = async () => {
  const validated = await validate(formData)

  if (!validated) {
    return
  }

  emit('submit', {
    ...validated,
    location: validated.location || null,
    website: validated.website || null,
    twitter_handle: validated.twitter_handle || null,
    instagram_handle: validated.instagram_handle || null,
    favicon_url: null,
    pros: [],
    cons: [],
    is_favorite: false,
    private_notes: {},
    user_id: '',
  })
}
</script>
