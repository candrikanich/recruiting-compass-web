<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-slate-900">📄 Recent Documents</h2>
      <NuxtLink to="/documents" class="text-sm font-semibold text-blue-600 hover:text-blue-700">
        View all →
      </NuxtLink>
    </div>

    <div v-if="recentDocuments.length === 0" class="text-center py-8 text-slate-600">
      <p>No documents uploaded yet</p>
      <NuxtLink to="/documents" class="font-semibold text-sm mt-2 inline-block text-blue-600 hover:text-blue-700">
        Upload a document
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div v-for="doc in recentDocuments" :key="doc.id" class="rounded-lg p-4 transition border border-slate-200 hover:shadow-md">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <p class="font-semibold truncate text-slate-900">{{ doc.title }}</p>
            <p class="text-xs capitalize text-slate-600">{{ doc.type }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-600">
            {{ formatDate(doc.created_at || '') }}
          </p>
          <div class="flex gap-2">
            <span v-if="(doc.shared_with_schools || []).length > 0" class="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">
              Shared: {{ (doc.shared_with_schools || []).length }}
            </span>
            <NuxtLink
              :to="`/documents/${doc.id}`"
              class="text-xs px-3 py-1 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              View
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDocuments } from '~/composables/useDocuments'
import type { Document } from '~/types/models'

const { documents } = useDocuments()

const recentDocuments = computed(() => {
  return documents.value
    .filter((doc: Document) => doc.is_current)
    .sort((a: Document, b: Document) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA
    })
    .slice(0, 5)
})

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}
</script>
