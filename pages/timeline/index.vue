<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Header -->
    <Header />

    <!-- Page Header Section -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Recruiting Timeline</h1>
            <p class="text-slate-600">Track your 4-year recruiting journey</p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Current Phase Badge -->
            <div v-if="!phaseLoading" class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div class="text-sm text-slate-600 mb-1">Current Phase</div>
              <div class="text-lg font-bold text-slate-900">{{ getPhaseDisplayName(currentPhase) }}</div>
            </div>

            <!-- Status Indicator -->
            <div v-if="!statusLoading" class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div class="text-sm text-slate-600 mb-1">Status</div>
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="getStatusColorClass(statusLabel)"
                />
                <div class="text-lg font-bold text-slate-900">{{ statusScore }}/100</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div v-for="i in 4" :key="i" class="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-700 mb-4">{{ error }}</p>
        <button
          @click="retryFetch"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>

      <!-- Main Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Phase Cards -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Freshman Phase Card -->
          <PhaseCardInline
            phase="freshman"
            title="Freshman Year"
            theme="Foundation & Awareness"
            :tasks="tasksByGrade[9]"
            :milestone-progress="currentPhase === 'freshman' ? milestoneProgress : undefined"
            :is-current-phase="currentPhase === 'freshman'"
            :expanded="freshmanExpanded"
            @toggle="freshmanExpanded = !freshmanExpanded"
            @task-toggle="handleTaskToggle"
          />

          <!-- Sophomore Phase Card -->
          <PhaseCardInline
            phase="sophomore"
            title="Sophomore Year"
            theme="Building Your Profile"
            :tasks="tasksByGrade[10]"
            :milestone-progress="currentPhase === 'sophomore' ? milestoneProgress : undefined"
            :is-current-phase="currentPhase === 'sophomore'"
            :expanded="sophomoreExpanded"
            @toggle="sophomoreExpanded = !sophomoreExpanded"
            @task-toggle="handleTaskToggle"
          />

          <!-- Junior Phase Card -->
          <PhaseCardInline
            phase="junior"
            title="Junior Year"
            theme="Active Recruiting"
            :tasks="tasksByGrade[11]"
            :milestone-progress="currentPhase === 'junior' ? milestoneProgress : undefined"
            :is-current-phase="currentPhase === 'junior'"
            :expanded="juniorExpanded"
            @toggle="juniorExpanded = !juniorExpanded"
            @task-toggle="handleTaskToggle"
          />

          <!-- Senior Phase Card -->
          <PhaseCardInline
            phase="senior"
            title="Senior Year"
            theme="Decision & Commitment"
            :tasks="tasksByGrade[12]"
            :milestone-progress="currentPhase === 'senior' ? milestoneProgress : undefined"
            :is-current-phase="currentPhase === 'senior'"
            :expanded="seniorExpanded"
            @toggle="seniorExpanded = !seniorExpanded"
            @task-toggle="handleTaskToggle"
          />
        </div>

        <!-- Right Column: Sidebar -->
        <div class="space-y-6">
          <!-- Portfolio Health -->
          <PortfolioHealth />

          <!-- Status Breakdown (if available) -->
          <div v-if="!statusLoading && scoreBreakdown" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 class="text-slate-900 font-semibold mb-4">Status Breakdown</h3>

            <div class="space-y-3">
              <!-- Task Completion -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">Task Completion</span>
                <span class="text-sm font-medium text-slate-900">{{ scoreBreakdown.taskCompletionRate * 100 | 0 }}%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500" :style="{ width: `${scoreBreakdown.taskCompletionRate * 100}%` }" />
              </div>

              <!-- Interaction Frequency -->
              <div class="flex items-center justify-between pt-2">
                <span class="text-sm text-slate-600">Interaction Frequency</span>
                <span class="text-sm font-medium text-slate-900">{{ scoreBreakdown.interactionFrequencyScore * 100 | 0 }}%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-purple-500" :style="{ width: `${scoreBreakdown.interactionFrequencyScore * 100}%` }" />
              </div>

              <!-- Coach Interest -->
              <div class="flex items-center justify-between pt-2">
                <span class="text-sm text-slate-600">Coach Interest</span>
                <span class="text-sm font-medium text-slate-900">{{ scoreBreakdown.coachInterestScore * 100 | 0 }}%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500" :style="{ width: `${scoreBreakdown.coachInterestScore * 100}%` }" />
              </div>

              <!-- Academic Standing -->
              <div class="flex items-center justify-between pt-2">
                <span class="text-sm text-slate-600">Academic Standing</span>
                <span class="text-sm font-medium text-slate-900">{{ scoreBreakdown.academicStandingScore * 100 | 0 }}%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-orange-500" :style="{ width: `${scoreBreakdown.academicStandingScore * 100}%` }" />
              </div>
            </div>
          </div>

          <!-- Milestone Progress (if current phase) -->
          <div v-if="!phaseLoading && currentPhase !== 'committed' && milestoneProgress" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 class="text-slate-900 font-semibold mb-4">Milestone Progress</h3>

            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-slate-600">Progress to Next Phase</span>
                <span class="text-sm font-medium text-slate-900">{{ milestoneProgress?.percentComplete ?? 0 }}%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-500" :style="{ width: `${milestoneProgress?.percentComplete ?? 0}%` }" />
              </div>
            </div>

            <div class="text-xs text-slate-600 space-y-1">
              <p>{{ milestoneProgress?.completed?.length ?? 0 }} of {{ milestoneProgress?.required?.length ?? 0 }} milestones complete</p>
              <p v-if="canAdvance" class="text-emerald-600 font-medium">✓ Ready to advance!</p>
              <p v-else class="text-slate-500">{{ milestoneProgress?.remaining?.length ?? 0 }} milestone{{ (milestoneProgress?.remaining?.length ?? 0) !== 1 ? 's' : '' }} remaining</p>
            </div>

            <button
              v-if="canAdvance"
              @click="advancePhase"
              class="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm"
            >
              Advance to Next Phase
            </button>
          </div>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
  .slide-fade-enter-active {
    transition: all 0.3s ease-out;
  }

  .slide-fade-leave-active {
    transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
  }

  .slide-fade-enter-from,
  .slide-fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
  }
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTasks } from '~/composables/useTasks'
import { usePhaseCalculation } from '~/composables/usePhaseCalculation'
import { useStatusScore } from '~/composables/useStatusScore'
import type { Phase, TaskWithStatus, StatusLabel } from '~/types/timeline'
import PhaseCardInline from '~/components/Timeline/PhaseCardInline.vue'
import PortfolioHealth from '~/components/Timeline/PortfolioHealth.vue'

definePageMeta({
  middleware: 'auth'
})

// Composables
const { tasksWithStatus, updateTaskStatus, loading: tasksLoading, error: tasksError, fetchTasksWithStatus } = useTasks()
const { currentPhase, milestoneProgress, canAdvance, loading: phaseLoading, error: phaseError, fetchPhase, advancePhase: phaseAdvancePhase } = usePhaseCalculation()
const { statusScore, statusLabel, scoreBreakdown, loading: statusLoading, error: statusError, fetchStatusScore } = useStatusScore()

// Local state for expand/collapse
const freshmanExpanded = ref(false)
const sophomoreExpanded = ref(false)
const juniorExpanded = ref(false)
const seniorExpanded = ref(false)

// Computed properties
const loading = computed(() => tasksLoading.value || phaseLoading.value || statusLoading.value)
const error = computed(() => tasksError.value || phaseError.value || statusError.value)

const tasksByGrade = computed(() => ({
  9: tasksWithStatus.value.filter(t => t.grade_level === 9),
  10: tasksWithStatus.value.filter(t => t.grade_level === 10),
  11: tasksWithStatus.value.filter(t => t.grade_level === 11),
  12: tasksWithStatus.value.filter(t => t.grade_level === 12)
}))

// Initialize expanded state based on current phase
const initializeExpanded = () => {
  const phaseGrades: Record<Phase, number> = {
    freshman: 9,
    sophomore: 10,
    junior: 11,
    senior: 12,
    committed: 12
  }

  const currentGrade = phaseGrades[currentPhase.value]

  freshmanExpanded.value = currentGrade === 9
  sophomoreExpanded.value = currentGrade === 10
  juniorExpanded.value = currentGrade === 11
  seniorExpanded.value = currentGrade === 12
}

// Handlers
const handleTaskToggle = async (taskId: string) => {
  const task = tasksWithStatus.value.find(t => t.id === taskId)
  if (!task) return

  const currentStatus = task.athlete_task?.status
  const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed'

  try {
    await updateTaskStatus(taskId, newStatus)
    // Refresh phase to check if milestones were completed
    await fetchPhase()
  } catch (err) {
    console.error('Failed to update task status:', err)
  }
}

const retryFetch = async () => {
  await fetchTasksWithStatus()
  await fetchPhase()
  await fetchStatusScore()
}

const advancePhase = async () => {
  await phaseAdvancePhase()
  initializeExpanded()
}

// Helper functions
const getPhaseDisplayName = (phase: Phase): string => {
  const names: Record<Phase, string> = {
    freshman: 'Freshman',
    sophomore: 'Sophomore',
    junior: 'Junior',
    senior: 'Senior',
    committed: 'Committed'
  }
  return names[phase]
}

const getStatusColorClass = (label: StatusLabel): string => {
  const colors: Record<StatusLabel, string> = {
    on_track: 'bg-green-500',
    slightly_behind: 'bg-yellow-500',
    at_risk: 'bg-red-500'
  }
  return colors[label]
}

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchTasksWithStatus(), fetchPhase(), fetchStatusScore()])
  initializeExpanded()
})
</script>
