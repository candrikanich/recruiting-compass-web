<template>
  <div v-if="!loading" class="bg-gradient-to-r border border-slate-200 rounded-xl p-4 mb-6 shadow-sm" :class="`${contextColor}`">
    <div class="flex items-center justify-between">
      <!-- Left side: Phase badge and message -->
      <div class="flex-1">
        <!-- Phase badge -->
        <div class="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-slate-900 mb-2">
          {{ getPhaseLabel(currentPhase) }}
        </div>

        <!-- Context message -->
        <p class="text-sm text-slate-700 font-medium">{{ message }}</p>
      </div>

      <!-- Right side: Link to timeline -->
      <NuxtLink
        to="/timeline"
        class="ml-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm whitespace-nowrap transition hover:underline flex-shrink-0"
      >
        View timeline →
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePhaseCalculation } from '~/composables/usePhaseCalculation'
import type { TimelineContext } from '~/utils/timelineContextMessages'
import type { Phase } from '~/types/timeline'

interface Props {
  context: TimelineContext
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

const { currentPhase, loading, fetchPhase } = usePhaseCalculation()

const contextColor = computed(() => `from-blue-50 to-slate-50`)

const message = computed(() => {
  // For now, return a simple message. Real messages would be generated based on actual data
  const contextMessages: Record<TimelineContext, Record<Phase, string>> = {
    schools: {
      freshman: 'Research programs that match your academic and athletic profile',
      sophomore: 'Build a balanced list of reach, match, and safety schools',
      junior: 'Expand your contact list with coaches from your target schools',
      senior: 'Focus on final recruitment conversations with top choices',
      committed: 'Connect with your future coaching staff'
    },
    coaches: {
      freshman: 'Focus on skill development — coach outreach happens later',
      sophomore: 'Start reaching out to coaches at your target schools',
      junior: 'Maintain consistent communication with interested coaches',
      senior: 'Keep top choices engaged through regular updates',
      committed: 'Build relationships with your future coaching staff'
    },
    interactions: {
      freshman: 'Attend showcases and camps to get on coaches radars',
      sophomore: 'Log your interactions to track engagement',
      junior: 'Stay active with camp appearances and school visits',
      senior: 'Follow up promptly after key interactions',
      committed: 'Continue building team chemistry'
    },
    events: {
      freshman: 'Research upcoming showcases and tournaments',
      sophomore: 'Register for summer camps and exposure events',
      junior: 'Prioritize high-value programs and events',
      senior: 'Confirm attendance at key program visits',
      committed: 'Prepare for team summer workouts and events'
    }
  }

  return contextMessages[props.context]?.[currentPhase.value] || 'Check your recruiting timeline'
})

const getPhaseLabel = (phase: Phase): string => {
  const labels: Record<Phase, string> = {
    freshman: 'Freshman Year',
    sophomore: 'Sophomore Year',
    junior: 'Junior Year',
    senior: 'Senior Year',
    committed: 'Committed'
  }
  return labels[phase]
}

onMounted(() => {
  if (!currentPhase.value) {
    fetchPhase()
  }
})
</script>
