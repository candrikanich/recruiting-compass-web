<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Error summary -->
    <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" />

    <!-- Role -->
    <div>
      <label for="role" class="block text-sm font-medium mb-1 text-slate-600">
        Role <span class="text-red-600">*</span>
      </label>
      <select
        id="role"
        v-model="formData.role"
        required
        class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
        :disabled="loading"
        @blur="validateRole"
      >
        <option value="">Select Role</option>
        <option value="head">Head Coach</option>
        <option value="assistant">Assistant Coach</option>
        <option value="recruiting">Recruiting Coordinator</option>
      </select>
      <FieldError :error="fieldErrors.role" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- First Name -->
      <div>
        <label for="firstName" class="block text-sm font-medium mb-1 text-slate-600">
          First Name <span class="text-red-600">*</span>
        </label>
        <input
          id="firstName"
          v-model="formData.first_name"
          type="text"
          required
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
          placeholder="e.g., John"
          :disabled="loading"
          @blur="validateFirstName"
        />
        <FieldError :error="fieldErrors.first_name" />
      </div>

      <!-- Last Name -->
      <div>
        <label for="lastName" class="block text-sm font-medium mb-1 text-slate-600">
          Last Name <span class="text-red-600">*</span>
        </label>
        <input
          id="lastName"
          v-model="formData.last_name"
          type="text"
          required
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
          placeholder="e.g., Smith"
          :disabled="loading"
          @blur="validateLastName"
        />
        <FieldError :error="fieldErrors.last_name" />
      </div>
    </div>

    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-medium mb-1 text-slate-600">
        Email
      </label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
        placeholder="john.smith@university.edu"
        :disabled="loading"
        @blur="validateEmail"
      />
      <FieldError :error="fieldErrors.email" />
    </div>

    <!-- Phone -->
    <div>
      <label for="phone" class="block text-sm font-medium mb-1 text-slate-600">
        Phone
      </label>
      <input
        id="phone"
        v-model="formData.phone"
        type="tel"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
        placeholder="(555) 123-4567"
        :disabled="loading"
        @blur="validatePhone"
      />
      <FieldError :error="fieldErrors.phone" />
    </div>

    <!-- Social Media -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="twitter" class="block text-sm font-medium mb-1 text-slate-600">
          Twitter Handle
        </label>
        <input
          id="twitter"
          v-model="formData.twitter_handle"
          type="text"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
          placeholder="@handle"
          :disabled="loading"
          @blur="validateTwitter"
        />
        <FieldError :error="fieldErrors.twitter_handle" />
      </div>

      <div>
        <label for="instagram" class="block text-sm font-medium mb-1 text-slate-600">
          Instagram Handle
        </label>
        <input
          id="instagram"
          v-model="formData.instagram_handle"
          type="text"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
          placeholder="@handle"
          :disabled="loading"
          @blur="validateInstagram"
        />
        <FieldError :error="fieldErrors.instagram_handle" />
      </div>
    </div>

    <!-- Notes -->
    <div>
      <label for="notes" class="block text-sm font-medium mb-1 text-slate-600">
        Notes
      </label>
      <textarea
        id="notes"
        v-model="formData.notes"
        rows="4"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
        placeholder="Any notes about this coach..."
        :disabled="loading"
        @blur="validateNotes"
      />
      <FieldError :error="fieldErrors.notes" />
    </div>

    <!-- Submit and Cancel buttons -->
    <div class="flex gap-4">
      <button
        type="submit"
        :disabled="loading || hasErrors || !formData.role || !formData.first_name || !formData.last_name"
        class="flex-1 px-4 py-2 text-white font-semibold rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {{ loading ? 'Adding...' : 'Add Coach' }}
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="flex-1 px-4 py-2 font-semibold rounded-lg transition bg-slate-100 text-slate-900 hover:bg-slate-200"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useFormValidation } from '~/composables/useFormValidation'
import { coachSchema } from '~/utils/validation/schemas'
import { z } from 'zod'

const props = defineProps<{
  loading: boolean
  initialData?: {
    role?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    twitter_handle?: string
    instagram_handle?: string
    notes?: string
  }
}>()

const emit = defineEmits<{
  submit: [data: any]
  cancel: []
}>()

const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } = useFormValidation()

// Form data - initialize with parent data or defaults
const formData = reactive({
  role: props.initialData?.role || '',
  first_name: props.initialData?.first_name || '',
  last_name: props.initialData?.last_name || '',
  email: props.initialData?.email || '',
  phone: props.initialData?.phone || '',
  twitter_handle: props.initialData?.twitter_handle || '',
  instagram_handle: props.initialData?.instagram_handle || '',
  notes: props.initialData?.notes || '',
})

// Watch for changes to initialData from parent
watch(() => props.initialData, (newData) => {
  if (newData) {
    if (newData.role !== undefined) formData.role = newData.role
    if (newData.first_name !== undefined) formData.first_name = newData.first_name
    if (newData.last_name !== undefined) formData.last_name = newData.last_name
    if (newData.email !== undefined) formData.email = newData.email
    if (newData.phone !== undefined) formData.phone = newData.phone
    if (newData.twitter_handle !== undefined) formData.twitter_handle = newData.twitter_handle
    if (newData.instagram_handle !== undefined) formData.instagram_handle = newData.instagram_handle
    if (newData.notes !== undefined) formData.notes = newData.notes
  }
}, { deep: true })

// Field validators
const validators = {
  role: z.object({ role: coachSchema.shape.role }),
  first_name: z.object({ first_name: coachSchema.shape.first_name }),
  last_name: z.object({ last_name: coachSchema.shape.last_name }),
  email: z.object({ email: coachSchema.shape.email }),
  phone: z.object({ phone: coachSchema.shape.phone }),
  twitter_handle: z.object({ twitter_handle: coachSchema.shape.twitter_handle }),
  instagram_handle: z.object({ instagram_handle: coachSchema.shape.instagram_handle }),
  notes: z.object({ notes: coachSchema.shape.notes }),
}

const validateRole = async () => {
  await validateField('role', formData.role, validators.role.shape.role)
}

const validateFirstName = async () => {
  await validateField('first_name', formData.first_name, validators.first_name.shape.first_name)
}

const validateLastName = async () => {
  await validateField('last_name', formData.last_name, validators.last_name.shape.last_name)
}

const validateEmail = async () => {
  await validateField('email', formData.email, validators.email.shape.email)
}

const validatePhone = async () => {
  await validateField('phone', formData.phone, validators.phone.shape.phone)
}

const validateTwitter = async () => {
  await validateField('twitter_handle', formData.twitter_handle, validators.twitter_handle.shape.twitter_handle)
}

const validateInstagram = async () => {
  await validateField('instagram_handle', formData.instagram_handle, validators.instagram_handle.shape.instagram_handle)
}

const validateNotes = async () => {
  await validateField('notes', formData.notes, validators.notes.shape.notes)
}

const handleSubmit = async () => {
  const validated = await validate(formData, coachSchema)

  if (!validated) {
    return
  }

  emit('submit', {
    ...validated,
    school_id: '',
  })
}
</script>
