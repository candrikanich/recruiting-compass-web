<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Event Info Section -->
    <div>
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-6">
        Event Info
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Event Type -->
        <DesignSystemFormSelect
          v-model="formData.type"
          label="Event Type"
          :required="true"
          :disabled="loading"
          :options="eventTypeOptions"
          :error="fieldErrors.type"
          @blur="validateType"
        />

        <!-- Event Name -->
        <DesignSystemFormInput
          v-model="formData.name"
          label="Event Name"
          :required="true"
          :disabled="loading"
          placeholder="e.g., Spring Showcase 2026"
          :error="fieldErrors.name"
          @blur="validateName"
        />

        <!-- School -->
        <DesignSystemFormSelect
          v-model="formData.school_id"
          label="School"
          :disabled="loading"
          :options="schoolOptions"
          :error="fieldErrors.school_id"
        />

        <!-- Event Source -->
        <DesignSystemFormSelect
          v-model="formData.event_source"
          label="Event Source"
          :disabled="loading"
          :options="eventSourceOptions"
          :error="fieldErrors.event_source"
        />

        <!-- Cost -->
        <DesignSystemFormInput
          v-model="formData.cost"
          label="Cost ($)"
          :disabled="loading"
          placeholder="0.00"
          :error="fieldErrors.cost"
        />

        <!-- URL -->
        <DesignSystemFormInput
          v-model="formData.url"
          label="Event URL"
          type="url"
          :disabled="loading"
          placeholder="https://..."
          :error="fieldErrors.url"
          @blur="validateUrl"
        />
      </div>
    </div>

    <!-- Date & Time Section -->
    <div>
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-6">
        Date & Time
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Start Date -->
        <DesignSystemFormDateInput
          v-model="formData.start_date"
          label="Start Date"
          :required="true"
          :disabled="loading"
          :error="fieldErrors.start_date"
          @blur="validateStartDate"
        />

        <!-- Start Time -->
        <DesignSystemFormTimeInput
          v-model="formData.start_time"
          label="Start Time"
          :disabled="loading"
          :error="fieldErrors.start_time"
        />

        <!-- End Date -->
        <DesignSystemFormDateInput
          v-model="formData.end_date"
          label="End Date"
          :disabled="loading"
          :error="fieldErrors.end_date"
        />

        <!-- End Time -->
        <DesignSystemFormTimeInput
          v-model="formData.end_time"
          label="End Time"
          :disabled="loading"
          :error="fieldErrors.end_time"
        />

        <!-- Check-in Time -->
        <DesignSystemFormTimeInput
          v-model="formData.checkin_time"
          label="Check-in Time"
          :disabled="loading"
          :error="fieldErrors.checkin_time"
        />
      </div>
    </div>

    <!-- Location Section -->
    <div>
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-6">
        Location
      </h2>
      <div class="space-y-6">
        <!-- Address -->
        <DesignSystemFormInput
          v-model="formData.address"
          label="Street Address"
          :disabled="loading"
          placeholder="e.g., 123 Main St"
          :error="fieldErrors.address"
        />

        <!-- City & State -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DesignSystemFormInput
            v-model="formData.city"
            label="City"
            :disabled="loading"
            placeholder="e.g., Atlanta"
            :error="fieldErrors.city"
          />

          <DesignSystemFormInput
            v-model="formData.state"
            label="State"
            :disabled="loading"
            placeholder="e.g., GA"
            :maxlength="2"
            :error="fieldErrors.state"
          />
        </div>
      </div>
    </div>

    <!-- Event Details Section -->
    <div>
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-6">
        Event Details
      </h2>
      <div class="space-y-6">
        <!-- Event Description -->
        <DesignSystemFormTextarea
          v-model="formData.description"
          label="Event Description"
          :disabled="loading"
          placeholder="Details about the event..."
          :rows="3"
          :error="fieldErrors.description"
        />

        <!-- Checkboxes -->
        <div class="flex gap-6">
          <DesignSystemFormCheckbox
            v-model="formData.registered"
            label="Registered"
            :disabled="loading"
          />
          <DesignSystemFormCheckbox
            v-model="formData.attended"
            label="Attended"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <!-- Performance Section -->
    <div>
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200 mb-6">
        Performance
      </h2>
      <DesignSystemFormTextarea
        v-model="formData.performance_notes"
        label="Performance Notes"
        :disabled="loading"
        placeholder="How did you perform? Any feedback from coaches?"
        :rows="4"
        :error="fieldErrors.performance_notes"
      />
    </div>

    <!-- Buttons -->
    <div class="flex gap-4">
      <button
        type="submit"
        :disabled="loading || !formData.type || !formData.name || !formData.start_date"
        class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? 'Creating...' : 'Create Event' }}
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
import { useFormValidation } from '~/composables/useFormValidation'
import { eventSchema } from '~/utils/validation/schemas'
import { z } from 'zod'
import type { School } from '~/types/models'

const props = defineProps<{
  loading: boolean
  schools: School[]
}>()

const emit = defineEmits<{
  submit: [data: any]
  cancel: []
}>()

const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } = useFormValidation()

const formData = reactive({
  type: '',
  name: '',
  school_id: '',
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
  cost: '',
  registered: false,
  attended: false,
  performance_notes: ''
})

// Event type options
const eventTypeOptions = computed(() => [
  { value: '', label: 'Select Type' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'camp', label: 'Camp' },
  { value: 'official_visit', label: 'Official Visit' },
  { value: 'unofficial_visit', label: 'Unofficial Visit' },
  { value: 'game', label: 'Game' }
])

// School options
const schoolOptions = computed(() => {
  const options = [
    { value: '', label: '-- Select a school --' },
    ...props.schools.map((school) => ({
      value: school.id,
      label: school.name
    })),
    { value: 'none', label: 'None' },
    { value: 'other', label: 'Other (not listed)' }
  ]
  return options
})

// Event source options
const eventSourceOptions = computed(() => [
  { value: '', label: 'Select Source (Optional)' },
  { value: 'email', label: 'Email' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'web_search', label: 'Web Search' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' }
])

// Watch for start date changes - default end date to same day
watch(
  () => formData.start_date,
  (newValue) => {
    if (newValue && !formData.end_date) {
      formData.end_date = newValue
    }
  }
)

// Watch for start time changes - default end time to 1 hour later
watch(
  () => formData.start_time,
  (newValue) => {
    if (newValue && !formData.end_time) {
      const [hours, minutes] = newValue.split(':')
      const endHour = (parseInt(hours) + 1) % 24
      formData.end_time = `${String(endHour).padStart(2, '0')}:${minutes}`
    }
  }
)

// Field validators
const validators = {
  type: z.object({ type: eventSchema.shape.type }),
  name: z.object({ name: eventSchema.shape.name }),
  start_date: z.object({ start_date: eventSchema.shape.start_date }),
  url: z.object({ url: eventSchema.shape.url })
}

const validateType = async () => {
  await validateField('type', formData.type, validators.type.shape.type)
}

const validateName = async () => {
  await validateField('name', formData.name, validators.name.shape.name)
}

const validateStartDate = async () => {
  await validateField('start_date', formData.start_date, validators.start_date.shape.start_date)
}

const validateUrl = async () => {
  await validateField('url', formData.url || '', validators.url.shape.url)
}

const handleSubmit = async () => {
  // Convert empty strings to appropriate types for validation
  const normalizedData = {
    type: formData.type,
    name: formData.name,
    school_id: formData.school_id === 'none' || !formData.school_id ? undefined : formData.school_id,
    location: undefined, // Not used in new form
    address: formData.address || undefined,
    city: formData.city || undefined,
    state: formData.state || undefined,
    start_date: formData.start_date,
    start_time: formData.start_time || undefined,
    end_date: formData.end_date || undefined,
    end_time: formData.end_time || undefined,
    url: formData.url || undefined,
    description: formData.description || undefined,
    cost: formData.cost ? parseFloat(formData.cost) : undefined,
    registered: formData.registered,
    attended: formData.attended,
    performance_notes: formData.performance_notes || undefined
  }

  const validated = await validate(normalizedData, eventSchema)

  if (!validated) {
    return
  }

  emit('submit', {
    ...validated,
    event_source: (formData.event_source || null) as
      | 'email'
      | 'flyer'
      | 'web_search'
      | 'recommendation'
      | 'friend'
      | 'other'
      | null,
    checkin_time: formData.checkin_time || null
  })
}
</script>
