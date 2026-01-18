<template>
  <div class="rounded-lg shadow p-6 bg-white">
    <!-- Header -->
    <h2 class="text-2xl font-bold mb-6 text-slate-900">{{ isEditing ? 'Edit Template' : 'Create Template' }}</h2>

    <form @submit.prevent="saveTemplate" class="space-y-6">
      <!-- Template Name -->
      <div>
        <label class="block text-sm font-medium mb-2 text-slate-600">Template Name</label>
        <input
          v-model="formData.name"
          type="text"
          placeholder="e.g., Initial Outreach"
          class="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
          required
        />
      </div>

      <!-- Type -->
      <div>
        <label class="block text-sm font-medium mb-2 text-slate-600">Message Type</label>
        <select
          v-model="formData.type"
          class="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
          required
        >
          <option value="email">Email</option>
          <option value="message">Text/SMS</option>
          <option value="phone_script">Phone Script</option>
        </select>
      </div>

      <!-- Subject (Email only) -->
      <div v-if="formData.type === 'email'">
        <label class="block text-sm font-medium mb-2 text-slate-600">Subject</label>
        <input
          v-model="formData.subject"
          type="text"
          placeholder="e.g., Baseball Recruitment Inquiry - {{playerName}}"
          class="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
        />
        <p class="text-xs mt-1 text-slate-600">Optional. Use {{ '{' }}{{ '{' }}variable{{ '}' }}{{ '}' }} syntax for dynamic content.</p>
      </div>

      <!-- Body -->
      <div>
        <label class="block text-sm font-medium mb-2 text-slate-600">Message</label>
        <textarea
          v-model="formData.body"
          :placeholder="`Enter template body. Use ${'{{'}}variable${'}'}} syntax for dynamic content.`"
          rows="8"
          class="w-full px-4 py-2 rounded-lg font-mono text-sm border border-slate-300 text-slate-900 bg-white"
          required
        />
        <p class="text-xs mt-1 text-slate-600">Use {{ '{' }}{{ '{' }}variable{{ '}' }}{{ '}' }} syntax for dynamic content.</p>
      </div>

      <!-- Available Variables -->
      <div>
        <details class="text-sm">
          <summary class="cursor-pointer font-medium transition text-blue-600">Available Variables</summary>
          <div class="mt-3 p-3 rounded border bg-slate-50 border-slate-300">
            <div v-for="variable in availableVariables" :key="variable.key" class="flex justify-between text-xs space-y-2">
              <code class="font-semibold text-blue-600">{{ formatVariableDisplay(variable.key) }}</code>
              <span class="text-slate-600">{{ variable.description }}</span>
            </div>
          </div>
        </details>
      </div>

      <!-- Preview -->
      <div v-if="preview">
        <label class="block text-sm font-medium mb-2 text-slate-600">Preview</label>
        <div class="p-4 rounded border text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto bg-slate-50 border-slate-300 text-slate-900">
          {{ preview }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-end pt-4 border-t border-slate-300">
        <button
          v-if="isEditing"
          type="button"
          @click="deleteTemplate"
          class="px-4 py-2 font-medium rounded-lg transition text-red-600 hover:bg-red-50 hover:opacity-20"
        >
          Delete
        </button>
        <button
          type="button"
          @click="emit('cancel')"
          class="px-4 py-2 font-medium rounded-lg transition border border-slate-300 text-slate-900 bg-slate-50 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-6 py-2 text-white font-medium rounded-lg transition bg-blue-600 hover:bg-blue-700"
        >
          Save Template
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCommunicationTemplates, type CommunicationTemplate } from '~/composables/useCommunicationTemplates'
import { AVAILABLE_VARIABLES } from '~/utils/templateVariables'

interface Props {
  template?: CommunicationTemplate
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [template: CommunicationTemplate]
  cancel: []
  delete: [id: string]
}>()

const { createTemplate, updateTemplate, deleteTemplate: deleteFromComposable, interpolateTemplate } = useCommunicationTemplates()

const formData = ref({
  name: props.template?.name || '',
  type: (props.template?.type || 'email') as 'email' | 'message' | 'phone_script',
  subject: props.template?.subject || '',
  body: props.template?.body || '',
})

const isEditing = computed(() => !!props.template)

const availableVariables = AVAILABLE_VARIABLES

// Helper to interpolate text containing variables
const interpolateText = (text: string, variables: Record<string, string>): string => {
  let result = text
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(pattern, value)
  })
  return result
}

const preview = computed(() => {
  if (!formData.value.body) return null

  // Create sample variables for preview
  const sampleVars: Record<string, string> = {
    playerName: 'John Smith',
    coachFirstName: 'Mike',
    coachLastName: 'Johnson',
    schoolName: 'Ohio State University',
    highSchool: 'Lincoln High School',
    gradYear: '2025',
    position: 'Shortstop',
    division: 'D1',
    eventName: 'Area Code Games',
    schoolTwitter: 'OhioStateBB',
    todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }

  const body = interpolateTemplate(
    { ...formData.value, id: 'preview', created_at: new Date().toISOString() } as CommunicationTemplate,
    sampleVars
  )
  const subject = formData.value.subject ? interpolateText(formData.value.subject, sampleVars) : ''

  return subject ? `${subject}\n\n${body}` : body
})

const saveTemplate = async () => {
  if (!formData.value.name || !formData.value.body) {
    alert('Please fill in all required fields')
    return
  }

  if (isEditing.value && props.template) {
    await updateTemplate(props.template.id, formData.value)
    emit('save', { ...props.template, ...formData.value } as CommunicationTemplate)
  } else {
    const newTemplate = await createTemplate(
      formData.value.name,
      formData.value.type,
      formData.value.body,
      formData.value.subject,
      undefined,
      undefined
    )
    if (newTemplate) {
      emit('save', newTemplate)
    }
  }
}

const deleteTemplate = async () => {
  if (props.template && confirm('Delete this template?')) {
    await deleteFromComposable(props.template.id)
    emit('delete', props.template.id)
  }
}

const formatVariableDisplay = (key: string): string => {
  return '{{' + key + '}}'
}
</script>
