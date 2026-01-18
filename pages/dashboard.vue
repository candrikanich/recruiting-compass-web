<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Global Navigation -->
    <Header />

    <!-- Page Header -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p v-if="user" class="text-slate-600 mt-1">Welcome back, {{ userFirstName }}! 👋</p>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Parent Context Banner -->
      <div v-if="isViewingAsParent" class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6">
        <div class="flex items-center">
          <EyeIcon class="w-5 h-5 text-indigo-600 mr-3" />
          <p class="text-sm text-indigo-800">
            You're viewing <strong>{{ getCurrentAthlete()?.full_name || 'this athlete' }}'s</strong> recruiting data.
            Data is read-only. Your views are visible to them.
          </p>
        </div>
      </div>

      <!-- Stats Cards Component -->
      <DashboardStatsCards
        :coach-count="coachCount"
        :school-count="schoolCount"
        :interaction-count="interactionCount"
        :total-offers="totalOffers"
        :accepted-offers="acceptedOffers"
      />

      <!-- Suggestions Component -->
      <DashboardSuggestions
        :suggestions="dashboardSuggestions"
        :is-viewing-as-parent="isViewingAsParent"
        :athlete-name="getCurrentAthlete()?.full_name"
        @dismiss="handleSuggestionDismiss"
      />

      <!-- Main Grid: 2/3 + 1/3 Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Charts Component -->
        <DashboardCharts
          :school-count="schoolCount"
          :school-size-breakdown="schoolSizeBreakdown"
          :metrics="allMetrics"
          :top-metrics="topMetrics"
          :interactions="allInteractions"
          :schools="allSchools"
          :graduation-year="graduationYear"
          :athlete-id="currentAthleteId || ''"
          :is-viewing-as-parent="isViewingAsParent"
          :show-calendar="showWidget('recruitingCalendar', 'widgets')"
        />

        <!-- Right Column - Analytics Component -->
        <DashboardAnalytics
          :upcoming-events="upcomingEvents"
          :notifications="recentNotifications"
          :tasks="tasks"
          @refresh-notifications="generateNotifications"
          @notification-click="handleNotificationClick"
          @add-task="addTask"
          @toggle-task="toggleTask"
          @delete-task="deleteTask"
          @clear-completed="clearCompleted"
        />
      </div>

      <!-- Additional Widgets (Full Width) -->
      <div class="mt-8 space-y-6">
        <LinkedAccountsWidget v-if="showWidget('linkedAccounts', 'widgets')" />
        <SchoolMapWidget v-if="showWidget('schoolMapWidget', 'widgets')" :schools="allSchools" />
        <CoachFollowupWidget v-if="showWidget('coachFollowupWidget', 'widgets')" />
        <AtAGlanceSummary
          v-if="showWidget('atAGlanceSummary', 'widgets')"
          :coaches="allCoaches"
          :schools="allSchools"
          :interactions="allInteractions"
          :offers="allOffers"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useSupabase } from '~/composables/useSupabase'
import { useAuth } from '~/composables/useAuth'
import { useUserStore } from '~/stores/user'
import { useNotificationStore } from '~/stores/notifications'
import { useNotifications } from '~/composables/useNotifications'
import { useDocuments } from '~/composables/useDocuments'
import { useToast } from '~/composables/useToast'
import { useUserTasks } from '~/composables/useUserTasks'
import { useUserPreferences } from '~/composables/useUserPreferences'
import { useSuggestions } from '~/composables/useSuggestions'
import { useParentContext } from '~/composables/useParentContext'
import { useViewLogging } from '~/composables/useViewLogging'
import DashboardStatsCards from '~/components/Dashboard/DashboardStatsCards.vue'
import DashboardSuggestions from '~/components/Dashboard/DashboardSuggestions.vue'
import DashboardCharts from '~/components/Dashboard/DashboardCharts.vue'
import DashboardAnalytics from '~/components/Dashboard/DashboardAnalytics.vue'
import SchoolMapWidget from '~/components/Dashboard/SchoolMapWidget.vue'
import CoachFollowupWidget from '~/components/Dashboard/CoachFollowupWidget.vue'
import AtAGlanceSummary from '~/components/Dashboard/AtAGlanceSummary.vue'
import LinkedAccountsWidget from '~/components/Dashboard/LinkedAccountsWidget.vue'
import {
  EyeIcon,
} from '@heroicons/vue/24/solid'
import { getCarnegieSize } from '~/utils/schoolSize'
import type { Coach, School, Interaction, Offer, Event, Notification, PerformanceMetric } from '~/types/models'

definePageMeta({
  middleware: ['auth', 'onboarding'],
})

const { signOut, user: authUser } = useAuth()
const supabase = useSupabase()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { notifications, fetchNotifications, unreadCount: notificationsUnreadCount } = useNotifications()
const { fetchDocuments } = useDocuments()
const { showToast } = useToast()
const { preferences, fetchPreferences } = useUserPreferences()
const {
  tasks,
  fetchTasks,
  addTask: addUserTask,
  toggleTask: toggleUserTask,
  deleteTask: deleteUserTask,
  clearCompleted,
  pendingCount,
  completedCount,
} = useUserTasks()

const { dashboardSuggestions, fetchSuggestions, dismissSuggestion } = useSuggestions()

// Parent context composables
const {
  isParent,
  isViewingAsParent,
  currentAthleteId,
  linkedAthletes,
  initialize: initializeParentContext,
  getCurrentAthlete,
} = useParentContext()
const { logParentView } = useViewLogging()

const user = ref<any>(null)
const coachCount = ref(0)
const schoolCount = ref(0)
const interactionCount = ref(0)
const allCoaches = ref<Coach[]>([])
const allSchools = ref<School[]>([])
const allInteractions = ref<Interaction[]>([])
const allOffers = ref<Offer[]>([])
const allEvents = ref<Event[]>([])
const allMetrics = ref<PerformanceMetric[]>([])
const showTaskForm = ref(false)
const newTask = ref('')
const generatingNotifications = ref(false)
const graduationYear = computed(() => {
  return preferences.value?.player_details?.graduation_year || new Date().getFullYear() + 4
})

// Determine target user ID (current user or viewed athlete if parent)
const targetUserId = computed(() => {
  return isViewingAsParent.value ? currentAthleteId.value : userStore.user?.id
})

const userFirstName = computed(() => {
  if (!user.value) return ''
  let firstName = ''
  if (user.value.full_name) {
    firstName = user.value.full_name.split(' ')[0]
  } else {
    firstName = user.value.email?.split('@')[0] || ''
  }
  return firstName.charAt(0).toUpperCase() + firstName.slice(1)
})

// Helper to check if widget should be shown based on preferences
const showWidget = (widgetKey: string, section: 'statsCards' | 'widgets'): boolean => {
  const layout = preferences.value?.dashboard_layout
  if (!layout) return true
  return (layout[section] as Record<string, boolean>)?.[widgetKey] ?? true
}

const recentNotifications = computed(() => {
  return notifications.value.slice(0, 5)
})

// Upcoming events (sorted by date)
const upcomingEvents = computed(() => {
  const now = new Date()
  return allEvents.value
    .filter(e => new Date(e.start_date) >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5)
})

// Top 3 performance metrics
const topMetrics = computed(() => {
  return allMetrics.value.slice(0, 3)
})

const totalOffers = computed(() => {
  return allOffers.value.length
})

const acceptedOffers = computed(() => {
  return allOffers.value.filter((o) => o.status === 'accepted').length
})

// Calculate school size breakdown
const schoolSizeBreakdown = computed(() => {
  const breakdown: Record<string, number> = {
    'Very Small': 0,
    'Small': 0,
    'Medium': 0,
    'Large': 0,
    'Very Large': 0,
  }

  allSchools.value.forEach((school) => {
    const studentSize = school.academic_info?.student_size
    if (studentSize) {
      const size = getCarnegieSize(typeof studentSize === 'number' ? studentSize : null)
      if (size && size in breakdown) {
        breakdown[size]++
      }
    }
  })

  return breakdown
})

const addTask = async () => {
  if (newTask.value.trim()) {
    await addUserTask(newTask.value)
    newTask.value = ''
    showTaskForm.value = false
  }
}

const toggleTask = async (taskId: string) => {
  await toggleUserTask(taskId)
}

const deleteTask = async (taskId: string) => {
  await deleteUserTask(taskId)
}

const handleSuggestionDismiss = async (suggestionId: string) => {
  await dismissSuggestion(suggestionId)
}

const fetchCounts = async () => {
  if (!targetUserId.value) {
    return
  }

  try {
    // Fetch schools
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('user_id', targetUserId.value)

    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError)
    } else if (schoolsData) {
      allSchools.value = schoolsData
      schoolCount.value = schoolsData.length
    }

    // Fetch coaches
    if (allSchools.value.length > 0) {
      const schoolIds = allSchools.value.map((s) => s.id)
      const { data: coachesData, count: coachesCount, error: coachesError } = await supabase
        .from('coaches')
        .select('*', { count: 'exact' })
        .in('school_id', schoolIds)

      if (!coachesError) {
        allCoaches.value = coachesData || []
        coachCount.value = coachesCount || 0
      }
    }

    // Fetch interactions
    const { data: interactionsData, count: interactionsCount, error: interactionsError } = await supabase
      .from('interactions')
      .select('*', { count: 'exact' })
      .eq('logged_by', targetUserId.value)

    if (!interactionsError && interactionsData) {
      allInteractions.value = interactionsData
      interactionCount.value = interactionsCount || 0
    }

    // Fetch offers
    try {
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('user_id', targetUserId.value)

      if (!offersError && offersData) {
        allOffers.value = offersData
      }
    } catch (err) {
      allOffers.value = []
    }

    // Fetch events
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', targetUserId.value)

      if (!eventsError && eventsData) {
        allEvents.value = eventsData
      }
    } catch (err) {
      allEvents.value = []
    }

    // Fetch performance metrics
    try {
      const { data: metricsData, error: metricsError } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('user_id', targetUserId.value)

      if (!metricsError && metricsData) {
        allMetrics.value = metricsData
      }
    } catch (err) {
      allMetrics.value = []
    }
  } catch (err) {
    console.error('Error fetching counts:', err)
  }
}

onMounted(async () => {
  user.value = authUser.value

  // Initialize parent context
  await initializeParentContext()

  // Handle edge case: parent with no linked athletes
  if (isParent.value && linkedAthletes.value.length === 0) {
    await navigateTo('/settings/account-linking')
    showToast('Link an athlete account to view their recruiting data', 'info')
    return
  }

  await fetchPreferences()
  await fetchCounts()
  await fetchDocuments()
  await fetchTasks()
  await fetchSuggestions('dashboard')

  // Log parent view
  if (isViewingAsParent.value && currentAthleteId.value) {
    await logParentView('dashboard', currentAthleteId.value)
  }
})

// Watch for athlete switches
watch(currentAthleteId, async (newId, oldId) => {
  if (newId && newId !== oldId && isViewingAsParent.value) {
    await fetchCounts()
    await fetchSuggestions('dashboard')
    await logParentView('dashboard', newId)
  }
})

const generateNotifications = async () => {
  try {
    generatingNotifications.value = true
    const result = await $fetch('/api/notifications/generate', { method: 'POST' })

    if (result.success) {
      showToast(`Created ${result.created} notifications`, 'success')
      await fetchNotifications()
    }
  } catch (err) {
    console.error('Error generating notifications:', err)
    showToast('Failed to generate notifications', 'error')
  } finally {
    generatingNotifications.value = false
  }
}

const handleNotificationClick = (notification: Notification) => {
  if (!notification.read_at) {
    const { markAsRead } = useNotifications()
    markAsRead(notification.id)
  }
}

watch(authUser, async (newUser) => {
  user.value = newUser
  if (newUser) {
    await fetchCounts()
    await fetchNotifications()
  }
}, { immediate: true })

</script>
