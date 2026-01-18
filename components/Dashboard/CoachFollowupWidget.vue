<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-slate-900">🎯 Coaches Needing Follow-up</h3>
      <span class="text-sm text-slate-600">{{ needsFollowup.length }} coaches</span>
    </div>

    <!-- Empty State -->
    <div v-if="needsFollowup.length === 0" class="text-center py-8 text-slate-600">
      <p class="text-lg">🎉 All caught up!</p>
      <p class="text-sm">No coaches need immediate follow-up</p>
    </div>

    <!-- Coach List -->
    <div v-else class="space-y-3">
      <div
        v-for="coach in needsFollowup.slice(0, 5)"
        :key="coach.id"
        class="flex items-center justify-between p-3 rounded-lg transition bg-slate-50 border border-orange-200 hover:bg-slate-100"
      >
        <div class="flex-1">
          <p class="font-semibold text-slate-900">{{ coach.first_name }} {{ coach.last_name }}</p>
          <p class="text-sm text-slate-600">{{ getSchoolName(coach.school_id) }}</p>
          <p class="text-xs font-medium text-orange-600">
            {{ getDaysSinceContact(coach.last_contact_date) }}
          </p>
        </div>
        <div class="flex gap-2">
          <!-- Email Button -->
          <button
            v-if="coach.email"
            @click="handleEmail(coach)"
            :title="`Email ${coach.email}`"
            class="p-2 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            ✉️
          </button>

          <!-- Text Button -->
          <button
            v-if="coach.phone"
            @click="handleText(coach)"
            :title="`Text ${coach.phone}`"
            class="p-2 rounded transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            💬
          </button>

          <!-- View Profile -->
          <NuxtLink
            :to="`/coaches/${coach.id}`"
            title="View full profile"
            class="p-2 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            👁️
          </NuxtLink>
        </div>
      </div>

      <!-- View All Link -->
      <NuxtLink
        v-if="needsFollowup.length > 5"
        to="/coaches?filter=needs-followup"
        class="block text-center text-sm font-semibold mt-4 pt-2 border-t border-slate-200 text-blue-600 hover:text-blue-700"
      >
        View all {{ needsFollowup.length }} coaches →
      </NuxtLink>
    </div>

    <!-- Communication Panel Modal -->
    <CommunicationPanel
      v-if="showPanel && selectedCoach"
      :coach="selectedCoach"
      :school="selectedCoachSchool"
      :initial-type="communicationType"
      @close="showPanel = false"
      @interaction-logged="onInteractionLogged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabase } from '~/composables/useSupabase'
import { useUserStore } from '~/stores/user'
import { useCommunication } from '~/composables/useCommunication'
import type { Coach, School } from '~/types/models'

const supabase = useSupabase()
const userStore = useUserStore()
const { showPanel, selectedCoach, communicationType, openCommunication, handleInteractionLogged } = useCommunication()

const allCoaches = ref<Coach[]>([])
const allSchools = ref<School[]>([])

// Threshold for follow-up: 14 days
const FOLLOW_UP_THRESHOLD_DAYS = 14

// Calculate coaches needing follow-up
const needsFollowup = computed(() => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - FOLLOW_UP_THRESHOLD_DAYS)

  return allCoaches.value
    .filter((coach) => {
      // Include coaches with no last contact, or those contacted before threshold
      if (!coach.last_contact_date) return true
      return new Date(coach.last_contact_date) < cutoffDate
    })
    .sort((a, b) => {
      // Sort by oldest contact first
      if (!a.last_contact_date) return -1
      if (!b.last_contact_date) return 1
      return new Date(a.last_contact_date).getTime() - new Date(b.last_contact_date).getTime()
    })
})

// Get school by ID
const getSchool = (schoolId?: string): School | undefined => {
  if (!schoolId) return undefined
  return allSchools.value.find((s) => s.id === schoolId)
}

// Get school name by ID
const getSchoolName = (schoolId?: string): string => {
  const school = getSchool(schoolId)
  return school?.name || 'Unknown'
}

// Get selected coach's school
const selectedCoachSchool = computed(() => {
  return selectedCoach.value ? getSchool(selectedCoach.value.school_id) : undefined
})

// Format days since contact
const getDaysSinceContact = (date: string | null): string => {
  if (!date) return 'Never contacted'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

// Email handler - opens communication panel with template
const handleEmail = (coach: Coach) => {
  openCommunication(coach, 'email')
}

// Text handler - opens communication panel with template
const handleText = (coach: Coach) => {
  openCommunication(coach, 'text')
}

// Fetch data
const fetchData = async () => {
  if (!userStore.user) return

  try {
    // Fetch schools
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('user_id', userStore.user.id)

    if (!schoolsError && schoolsData) {
      allSchools.value = schoolsData
    }

    // Fetch coaches
    if (allSchools.value.length > 0) {
      const schoolIds = allSchools.value.map((s) => s.id)
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .in('school_id', schoolIds)
        .order('last_contact_date', { ascending: true, nullsFirst: true })

      if (!coachesError && coachesData) {
        allCoaches.value = coachesData
      }
    }
  } catch (err) {
    console.error('Error fetching follow-up data:', err)
  }
}

// Handle interaction logging - refresh data after successful log
const onInteractionLogged = async (interactionData: any) => {
  try {
    await handleInteractionLogged(interactionData, fetchData)
  } catch (err) {
    console.error('Error logging interaction:', err)
  }
}

onMounted(async () => {
  await fetchData()
})
</script>
