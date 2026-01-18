<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <h2 class="text-xl font-bold mb-6 text-slate-900">👥 Coach Responsiveness Rankings</h2>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      <div class="text-center">
        <p class="text-sm text-slate-600">Average Score</p>
        <p class="text-3xl font-bold mt-2 text-blue-600">{{ averageResponsiveness }}%</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-600">Most Responsive</p>
        <p class="text-2xl font-bold mt-2 text-emerald-600">{{ topResponsiveness }}%</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-600">Total Coaches</p>
        <p class="text-3xl font-bold mt-2 text-slate-900">{{ coaches.length }}</p>
      </div>
    </div>

    <!-- Top Coaches -->
    <div v-if="topCoaches.length > 0" class="border-t border-slate-200 pt-6">
      <h3 class="font-semibold mb-4 text-slate-900">Top Performers</h3>
      <div class="space-y-3">
        <div v-for="(coach, idx) in topCoaches.slice(0, 5)" :key="coach.id" class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1">
            <span class="text-xl font-bold w-6 text-center text-slate-600">
              {{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1 }}
            </span>
            <div class="flex-1">
              <NuxtLink :to="`/coaches/${coach.id}`" class="font-semibold text-slate-900 hover:text-blue-600">
                {{ coach.first_name }} {{ coach.last_name }}
              </NuxtLink>
              <p class="text-xs text-slate-600">{{ getSchoolName(coach.school_id) }}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center gap-2">
              <div class="w-24 rounded-full h-2 bg-slate-200">
                <div
                  class="h-2 rounded-full"
                  :class="getScoreColorClass(coach.responsiveness_score)"
                  :style="{ width: coach.responsiveness_score + '%' }"
                />
              </div>
              <span class="text-sm font-semibold w-12 text-right text-slate-900">{{ Math.round(coach.responsiveness_score) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Needs Follow-up -->
    <div v-if="needsFollowUp.length > 0" class="border-t border-slate-200 pt-6 mt-6">
      <h3 class="font-semibold mb-4 text-slate-900">🔴 Needs Follow-up (Low Responsiveness)</h3>
      <div class="space-y-3">
        <div v-for="coach in needsFollowUp" :key="coach.id" class="p-3 rounded-lg bg-red-50 border border-red-300">
          <div class="flex items-center justify-between">
            <div>
              <NuxtLink :to="`/coaches/${coach.id}`" class="font-semibold text-slate-900 hover:text-blue-600">
                {{ coach.first_name }} {{ coach.last_name }}
              </NuxtLink>
              <p class="text-xs text-slate-600">{{ getSchoolName(coach.school_id) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-red-600">{{ Math.round(coach.responsiveness_score) }}%</p>
              <p class="text-xs text-slate-600">{{ daysSinceContact(coach.last_contact_date) }}d since contact</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="coaches.length === 0" class="text-center py-8 text-slate-600">
      <p>No coaches yet. Add coaches through school detail pages.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Coach, School } from '~/types/models'

interface Props {
  coaches: Coach[]
  schools: School[]
}

const props = defineProps<Props>()

const schoolMap = computed(() => {
  const map: Record<string, string> = {}
  props.schools.forEach((s) => {
    map[s.id] = s.name
  })
  return map
})

const averageResponsiveness = computed(() => {
  if (props.coaches.length === 0) return 0
  const sum = props.coaches.reduce((acc, c) => acc + c.responsiveness_score, 0)
  return Math.round(sum / props.coaches.length)
})

const topResponsiveness = computed(() => {
  if (props.coaches.length === 0) return 0
  return Math.max(...props.coaches.map((c) => c.responsiveness_score))
})

const topCoaches = computed(() => {
  return [...props.coaches].sort((a, b) => b.responsiveness_score - a.responsiveness_score)
})

const needsFollowUp = computed(() => {
  return props.coaches.filter((c) => c.responsiveness_score < 50).sort((a, b) => a.responsiveness_score - b.responsiveness_score)
})

const getSchoolName = (schoolId?: string): string => {
  if (!schoolId) return 'Unknown'
  return schoolMap.value[schoolId] || 'Unknown'
}

const getScoreColorClass = (score: number): string => {
  if (score >= 80) return 'bg-emerald-600'
  if (score >= 60) return 'bg-blue-600'
  if (score >= 40) return 'bg-orange-600'
  return 'bg-red-600'
}

const daysSinceContact = (lastContactDate?: string | null): number => {
  if (!lastContactDate) return 999
  const now = new Date()
  const lastContact = new Date(lastContactDate)
  const diffTime = Math.abs(now.getTime() - lastContact.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
</script>
