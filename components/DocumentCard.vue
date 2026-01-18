<template>
  <div class="rounded-lg shadow p-6 hover:shadow-lg transition flex flex-col bg-white">
    <!-- Document Icon/Preview -->
    <div class="mb-4 h-24 rounded-lg flex items-center justify-center bg-slate-100">
      <span class="text-4xl">{{ getDocumentIcon(document.type) }}</span>
    </div>

    <!-- Document Info -->
    <div class="flex-1 mb-4">
      <p class="text-xs font-semibold mb-1 text-blue-600">{{ getTypeLabel(document.type) }}</p>
      <h3 class="text-lg font-bold line-clamp-2 text-slate-900">{{ document.title }}</h3>
      <p v-if="document.description" class="text-sm mt-2 line-clamp-2 text-slate-600">
        {{ document.description }}
      </p>

      <!-- Metadata -->
      <div class="space-y-1 mt-3 text-xs text-slate-600">
        <p v-if="schoolName" class="flex items-center gap-1">
          <BuildingLibraryIcon class="w-4 h-4" />
          <span>{{ schoolName }}</span>
        </p>
        <p v-if="document.version">📌 Version {{ document.version }}</p>
        <p v-if="document.shared_with_schools && document.shared_with_schools.length > 0" class="flex items-center gap-1 text-emerald-600">
          <CheckIcon class="w-4 h-4" />
          <span>Shared with {{ document.shared_with_schools.length }} school(s)</span>
        </p>
        <p>📅 {{ formatDate(document.created_at) }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="pt-4 flex gap-2 border-t border-slate-200">
      <NuxtLink
        :to="{
          path: '/documents/view',
          query: { id: document.id }
        }"
        class="flex-1 text-center px-3 py-2 text-sm font-semibold rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
      >
        View Details →
      </NuxtLink>
      <button
        v-if="showActions"
        @click="handleDelete"
        class="flex-1 px-3 py-2 text-sm font-semibold rounded transition bg-red-600 text-white hover:opacity-90"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon, BuildingLibraryIcon } from '@heroicons/vue/24/outline'
import type { Document } from '~/types/models'

interface Props {
  document: Document
  schoolName?: string
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: undefined,
  showActions: true,
})

const emit = defineEmits<{
  delete: [id: string]
}>()

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    highlight_video: 'Highlight Video',
    transcript: 'Transcript',
    resume: 'Resume',
    rec_letter: 'Rec Letter',
    questionnaire: 'Questionnaire',
    stats_sheet: 'Stats Sheet',
  }
  return labels[type] || type
}

const getDocumentIcon = (type: string): string => {
  const icons: Record<string, string> = {
    highlight_video: '🎬',
    transcript: '📄',
    resume: '📋',
    rec_letter: '💌',
    questionnaire: '📝',
    stats_sheet: '📊',
  }
  return icons[type] || '📎'
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const handleDelete = () => {
  if (confirm('Delete this document?')) {
    emit('delete', props.document.id)
  }
}
</script>
