<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-300">
        <h2 class="text-2xl font-bold text-slate-900">Send {{ messageType }}</h2>
        <button
          @click="emit('close')"
          class="transition text-slate-600 hover:text-slate-900"
          aria-label="Close"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Template Selection Step -->
        <div v-if="step === 'select'" class="space-y-4">
          <p class="text-sm mb-4 text-slate-600">Choose a template or start from scratch</p>
          <button
            v-for="template in availableTemplates"
            :key="template.id"
            @click="selectTemplate(template)"
            class="w-full text-left p-4 rounded-lg transition border border-slate-300 hover:border-blue-500 hover:bg-blue-50"
          >
            <h3 class="font-semibold text-slate-900">{{ template.name }}</h3>
            <p class="text-sm mt-1 line-clamp-2 text-slate-600">{{ template.body }}</p>
          </button>
        </div>

        <!-- Message Customization Step -->
        <div v-if="step === 'customize'" class="space-y-4">
          <!-- Subject (Email only) -->
          <div v-if="messageType === 'Email'">
            <label class="block text-sm font-medium mb-2 text-slate-600">Subject</label>
            <input
              v-model="composedMessage.subject"
              type="text"
              class="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
            />
          </div>

          <!-- Message Body -->
          <div>
            <label class="block text-sm font-medium mb-2 text-slate-600">Message</label>
            <textarea
              v-model="composedMessage.body"
              rows="10"
              class="w-full px-4 py-2 rounded-lg font-mono text-sm border border-slate-300 text-slate-900 bg-white"
            />
            <p class="text-xs mt-1 text-slate-600">You can edit the message before sending</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex gap-3 p-6 border-t border-slate-300 bg-slate-50">
        <button
          v-if="step === 'customize'"
          @click="step = 'select'"
          class="px-4 py-2 font-medium rounded-lg transition border border-slate-300 text-slate-900 hover:bg-slate-100"
        >
          Back
        </button>
        <button
          @click="emit('close')"
          class="flex-1 px-4 py-2 font-medium rounded-lg transition border border-slate-300 text-slate-900 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          v-if="step === 'select'"
          @click="emit('close')"
          class="px-4 py-2 font-medium rounded-lg transition bg-slate-50 text-slate-900 hover:bg-slate-100"
        >
          Close
        </button>
        <button
          v-if="step === 'customize'"
          @click="sendMessage"
          :disabled="!composedMessage.body"
          :class="[
            'px-6 py-2 text-white font-medium rounded-lg transition',
            !composedMessage.body
              ? 'bg-blue-600 opacity-50 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          ]"
        >
          Send {{ messageType }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import { useCommunicationTemplates, type CommunicationTemplate } from '~/composables/useCommunicationTemplates'

interface Props {
  isOpen: boolean
  coach: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  school?: {
    name: string
  }
  messageType: 'Email' | 'Text' | 'Twitter'
  playerName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  send: [message: { subject?: string; body: string }]
}>()

const { allTemplates, loadUserTemplates, interpolateTemplate } = useCommunicationTemplates()

const step = ref<'select' | 'customize'>('select')
const selectedTemplate = ref<CommunicationTemplate | null>(null)
const composedMessage = ref({ subject: '', body: '' })

loadUserTemplates()

const messageTypeMap: Record<string, 'email' | 'message' | 'phone_script'> = {
  Email: 'email',
  Text: 'message',
  Twitter: 'message', // Twitter can use message templates
}

const availableTemplates = computed(() => {
  const type = messageTypeMap[props.messageType]
  return allTemplates.value.filter((t) => t.type === type)
})

// Helper to interpolate text containing variables
const interpolateText = (text: string, variables: Record<string, string>): string => {
  let result = text
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(pattern, value)
  })
  return result
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      step.value = 'select'
      selectedTemplate.value = null
      composedMessage.value = { subject: '', body: '' }
    }
  }
)

const selectTemplate = (template: CommunicationTemplate) => {
  selectedTemplate.value = template

  // Interpolate variables
  const variables: Record<string, string> = {
    playerName: props.playerName || 'Player',
    coachFirstName: props.coach.first_name,
    coachLastName: props.coach.last_name,
    schoolName: props.school?.name || 'School',
    todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }

  const body = interpolateTemplate(template, variables)
  const subject = template.subject ? interpolateText(template.subject, variables) : ''
  composedMessage.value = {
    subject: subject,
    body: body,
  }

  step.value = 'customize'
}

const sendMessage = () => {
  emit('send', composedMessage.value)
  emit('close')
}
</script>
