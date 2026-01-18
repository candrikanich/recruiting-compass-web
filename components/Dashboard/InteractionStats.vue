<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <h2 class="text-xl font-bold mb-6 text-slate-900">📊 Interaction Stats</h2>

    <!-- Summary Row -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div class="text-center">
        <p class="text-sm text-slate-600">Total</p>
        <p class="text-3xl font-bold mt-2 text-slate-900">{{ totalInteractions }}</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-600">This Month</p>
        <p class="text-3xl font-bold mt-2 text-blue-600">{{ thisMonthInteractions }}</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-600">Outbound</p>
        <p class="text-3xl font-bold mt-2 text-emerald-600">{{ outboundCount }}</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-600">Inbound</p>
        <p class="text-3xl font-bold mt-2 text-purple-600">{{ inboundCount }}</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-600">Avg/Day</p>
        <p class="text-3xl font-bold mt-2 text-orange-600">{{ avgPerDay }}</p>
      </div>
    </div>

    <!-- Interaction Type Breakdown -->
    <div class="pt-6 border-t border-slate-200">
      <h3 class="font-semibold mb-4 text-slate-900">By Type</h3>
      <div class="space-y-3">
        <div v-for="type in interactionTypes" :key="type.type" class="flex items-center justify-between">
          <div class="flex items-center gap-2 flex-1">
            <span>{{ getTypeEmoji(type.type) }}</span>
            <span class="text-sm text-slate-900">{{ getTypeLabel(type.type) }}</span>
            <div class="flex-1 rounded-full h-2 ml-2 bg-slate-200">
              <div
                class="h-2 rounded-full bg-blue-600"
                :style="{ width: getPercentage(type.count) + '%' }"
              />
            </div>
          </div>
          <span class="text-sm font-semibold text-slate-900">{{ type.count }}</span>
        </div>
      </div>
    </div>

    <!-- Sentiment Breakdown -->
    <div class="pt-6 mt-6 border-t border-slate-200">
      <h3 class="font-semibold mb-4 text-slate-900">Sentiment Analysis</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          v-for="sentiment in sentiments"
          :key="sentiment.type"
          class="text-center p-3 rounded-lg border border-slate-200"
        >
          <p class="text-2xl mb-1">{{ getSentimentEmoji(sentiment.type) }}</p>
          <p class="text-xs text-slate-600">{{ getSentimentLabel(sentiment.type) }}</p>
          <p class="text-lg font-bold mt-1 text-slate-900">{{ sentiment.count }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Interaction } from '~/types/models'

interface Props {
  interactions: Interaction[]
}

const props = defineProps<Props>()

const totalInteractions = computed(() => props.interactions.length)

const thisMonthInteractions = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return props.interactions.filter((i) => {
    const date = new Date(i.occurred_at || '')
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  }).length
})

const outboundCount = computed(() => props.interactions.filter((i) => i.direction === 'outbound').length)

const inboundCount = computed(() => props.interactions.filter((i) => i.direction === 'inbound').length)

const avgPerDay = computed(() => {
  if (totalInteractions.value === 0) return 0
  const oldestDate = props.interactions.reduce((min, i) => {
    const date = new Date(i.occurred_at || '')
    return date < new Date(min.occurred_at || '') ? i : min
  }, props.interactions[0])

  if (!oldestDate) return 0
  const days = Math.ceil((Date.now() - new Date(oldestDate.occurred_at || '').getTime()) / (1000 * 60 * 60 * 24))
  return (totalInteractions.value / days).toFixed(1)
})

const interactionTypes = computed(() => {
  const types: Record<string, number> = {}
  props.interactions.forEach((i) => {
    types[i.type] = (types[i.type] || 0) + 1
  })

  return Object.entries(types)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
})

const sentiments = computed(() => {
  const sentiments: Record<string, number> = {
    very_positive: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  }

  props.interactions.forEach((i) => {
    if (i.sentiment && i.sentiment in sentiments) {
      sentiments[i.sentiment]++
    }
  })

  return Object.entries(sentiments).map(([type, count]) => ({ type, count }))
})

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    email: 'Email',
    text: 'Text',
    phone_call: 'Phone Call',
    in_person_visit: 'In-Person',
    virtual_meeting: 'Virtual',
    camp: 'Camp',
    showcase: 'Showcase',
    tweet: 'Tweet',
    dm: 'DM',
  }
  return labels[type] || type
}

const getTypeEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    email: '📧',
    text: '💬',
    phone_call: '☎️',
    in_person_visit: '👥',
    virtual_meeting: '💻',
    camp: '⚾',
    showcase: '🎯',
    tweet: '𝕏',
    dm: '💭',
  }
  return emojis[type] || '📌'
}

const getSentimentEmoji = (sentiment: string): string => {
  const emojis: Record<string, string> = {
    very_positive: '😄',
    positive: '😊',
    neutral: '😐',
    negative: '😕',
  }
  return emojis[sentiment] || '❓'
}

const getSentimentLabel = (sentiment: string): string => {
  const labels: Record<string, string> = {
    very_positive: 'Very Positive',
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
  }
  return labels[sentiment] || sentiment
}

const getPercentage = (count: number): number => {
  if (totalInteractions.value === 0) return 0
  return (count / totalInteractions.value) * 100
}
</script>
