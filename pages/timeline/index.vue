<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Header -->

    <!-- Page Header Section -->
    <div
      class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">
              Recruiting Timeline
            </h1>
            <p class="text-slate-600">Track your 4-year recruiting journey</p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Current Phase Badge -->
            <div
              v-if="!phaseLoading"
              class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
            >
              <div class="text-sm text-slate-600 mb-1">Current Phase</div>
              <div class="text-lg font-bold text-slate-900">
                {{ getPhaseDisplayName(currentPhase) }}
              </div>
            </div>

            <!-- Status Indicator -->
            <div
              v-if="!statusLoading"
              class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
            >
              <div class="text-sm text-slate-600 mb-1">Status</div>
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="getStatusColorClass(statusLabel)"
                />
                <div class="text-lg font-bold text-slate-900">
                  {{ statusScore }}/100
                </div>
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
        <div
          v-for="i in 4"
          :key="i"
          class="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse"
        />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-6"
      >
        <p class="text-red-700 mb-4">{{ error }}</p>
        <button
          @click="retryFetch"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>

      <!-- Content Section -->
      <div v-else>
        <!-- Main Grid: Tasks (2/3) + Guidance Sidebar (1/3) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: Stat Pills + Phase Cards -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Stat Pills -->
            <TimelineStatPills
              :status-score="statusScore"
              :status-label="statusLabel"
              :task-completed="taskCompletedCount"
              :task-total="taskTotalCount"
              :milestones-completed="milestonesCompletedCount"
              :milestones-total="milestonesTotalCount"
            />

            <!-- Freshman Phase Card -->
            <PhaseCardInline
              phase="freshman"
              title="Freshman Year"
              theme="Foundation & Awareness"
              :tasks="tasksByGrade[9]"
              :milestone-progress="
                currentPhase === 'freshman' ? milestoneProgress : undefined
              "
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
              :milestone-progress="
                currentPhase === 'sophomore' ? milestoneProgress : undefined
              "
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
              :milestone-progress="
                currentPhase === 'junior' ? milestoneProgress : undefined
              "
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
              :milestone-progress="
                currentPhase === 'senior' ? milestoneProgress : undefined
              "
              :is-current-phase="currentPhase === 'senior'"
              :expanded="seniorExpanded"
              @toggle="seniorExpanded = !seniorExpanded"
              @task-toggle="handleTaskToggle"
            />
          </div>

          <!-- Right Column: Guidance Sidebar -->
          <div data-testid="guidance-sidebar" class="space-y-4">
            <WhatMattersNow
              :priorities="whatMattersNow"
              :phase-label="getPhaseDisplayName(currentPhase)"
              :collapsed="whatMattersCollapsed"
              @toggle="whatMattersCollapsed = !whatMattersCollapsed"
              @priority-click="handlePriorityClick"
            />
            <UpcomingMilestones
              :milestones="upcomingMilestones"
              :collapsed="milestonesCollapsed"
              @toggle="milestonesCollapsed = !milestonesCollapsed"
            />
            <CommonWorries
              :worries="commonWorries"
              :collapsed="worriesCollapsed"
              @toggle="worriesCollapsed = !worriesCollapsed"
            />
            <WhatNotToStress
              :messages="reassuranceMessages"
              :collapsed="stressCollapsed"
              @toggle="stressCollapsed = !stressCollapsed"
            />
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
:deep(.task-highlight) {
  animation: highlight-pulse 2s ease-out;
}

@keyframes highlight-pulse {
  0%,
  15% {
    background-color: rgb(219 234 254); /* blue-100 */
    box-shadow: 0 0 0 2px rgb(147 197 253); /* blue-300 */
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useTasks } from "~/composables/useTasks";
import { usePhaseCalculation } from "~/composables/usePhaseCalculation";
import { useStatusScore } from "~/composables/useStatusScore";
import type { Phase, StatusLabel } from "~/types/timeline";
import PhaseCardInline from "~/components/Timeline/PhaseCardInline.vue";
import TimelineStatPills from "~/components/Timeline/TimelineStatPills.vue";
import WhatMattersNow from "~/components/Timeline/WhatMattersNow.vue";
import CommonWorries from "~/components/Timeline/CommonWorries.vue";
import WhatNotToStress from "~/components/Timeline/WhatNotToStress.vue";
import UpcomingMilestones from "~/components/Timeline/UpcomingMilestones.vue";
import { getWhatMattersNow } from "~/utils/whatMattersNow";
import { getCommonWorries } from "~/utils/parentWorries";
import { getReassuranceMessages } from "~/utils/parentReassurance";
import { getUpcomingMilestones } from "~/server/utils/ncaaRecruitingCalendar";

definePageMeta({
  middleware: "auth",
});

// Composables
const {
  tasksWithStatus,
  updateTaskStatus,
  loading: tasksLoading,
  error: tasksError,
  fetchTasksWithStatus,
} = useTasks();
const {
  currentPhase,
  milestoneProgress,
  loading: phaseLoading,
  error: phaseError,
  fetchPhase,
} = usePhaseCalculation();
const {
  statusScore,
  statusLabel,
  loading: statusLoading,
  error: statusError,
  fetchStatusScore,
} = useStatusScore();

// Local state for phase expand/collapse
const freshmanExpanded = ref(false);
const sophomoreExpanded = ref(false);
const juniorExpanded = ref(false);
const seniorExpanded = ref(false);

// Guidance sidebar collapse state
const whatMattersCollapsed = ref(false);
const milestonesCollapsed = ref(true);
const worriesCollapsed = ref(true);
const stressCollapsed = ref(true);

// Computed properties
// Only show loading skeletons on initial load, not on background refreshes
const initialLoadComplete = ref(false);
const loading = computed(
  () =>
    !initialLoadComplete.value &&
    (tasksLoading.value || phaseLoading.value || statusLoading.value),
);
const error = computed(
  () => tasksError.value || phaseError.value || statusError.value,
);

const tasksByGrade = computed(() => ({
  9: tasksWithStatus.value.filter((t) => t.grade_level === 9),
  10: tasksWithStatus.value.filter((t) => t.grade_level === 10),
  11: tasksWithStatus.value.filter((t) => t.grade_level === 11),
  12: tasksWithStatus.value.filter((t) => t.grade_level === 12),
}));

// Stat pill aggregates
const taskCompletedCount = computed(
  () =>
    tasksWithStatus.value.filter(
      (t) => t.athlete_task?.status === "completed",
    ).length,
);
const taskTotalCount = computed(() => tasksWithStatus.value.length);
const milestonesCompletedCount = computed(
  () => milestoneProgress.value?.completed?.length ?? 0,
);
const milestonesTotalCount = computed(
  () => milestoneProgress.value?.required?.length ?? 0,
);

// Parent guidance sections computed properties
const whatMattersNow = computed(() =>
  getWhatMattersNow({
    phase: currentPhase.value,
    tasksWithStatus: tasksWithStatus.value,
  }),
);

const commonWorries = computed(() => getCommonWorries(currentPhase.value));

const reassuranceMessages = computed(() =>
  getReassuranceMessages(currentPhase.value),
);

const upcomingMilestones = computed(() =>
  getUpcomingMilestones({
    currentDate: new Date(),
    phase: currentPhase.value,
    graduationYear: 2027, // TODO: Get from user profile via graduation_year field
    limit: 5,
  }),
);

// Initialize expanded state based on current phase
const initializeExpanded = () => {
  const phaseGrades: Record<Phase, number> = {
    freshman: 9,
    sophomore: 10,
    junior: 11,
    senior: 12,
    committed: 12,
  };

  const currentGrade = phaseGrades[currentPhase.value];

  freshmanExpanded.value = currentGrade === 9;
  sophomoreExpanded.value = currentGrade === 10;
  juniorExpanded.value = currentGrade === 11;
  seniorExpanded.value = currentGrade === 12;
};

// Handlers
const handleTaskToggle = async (taskId: string) => {
  const task = tasksWithStatus.value.find((t) => t.id === taskId);
  if (!task) return;

  const currentStatus = task.athlete_task?.status;
  const newStatus = currentStatus === "completed" ? "not_started" : "completed";

  try {
    await updateTaskStatus(taskId, newStatus);
    // Refresh phase to check if milestones were completed
    await fetchPhase();
  } catch (err) {
    console.error("Failed to update task status:", err);
  }
};

const retryFetch = async () => {
  initialLoadComplete.value = false;
  await fetchTasksWithStatus();
  await fetchPhase();
  await fetchStatusScore();
  initialLoadComplete.value = true;
};

const handlePriorityClick = (taskId: string) => {
  // Find which phase card contains this task
  const task = tasksWithStatus.value.find((t) => t.id === taskId);
  if (!task) return;

  const gradeLevel = task.grade_level;

  // Expand the appropriate phase card
  if (gradeLevel === 9) freshmanExpanded.value = true;
  else if (gradeLevel === 10) sophomoreExpanded.value = true;
  else if (gradeLevel === 11) juniorExpanded.value = true;
  else if (gradeLevel === 12) seniorExpanded.value = true;

  // Wait for expansion animation (300ms transition), then scroll and highlight
  setTimeout(() => {
    const taskElement = document.querySelector(
      `[data-task-id="${taskId}"]`,
    ) as HTMLElement | null;
    if (!taskElement) return;

    taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
    taskElement.classList.add("task-highlight");
    setTimeout(() => taskElement.classList.remove("task-highlight"), 2000);
  }, 350);
};

// Helper functions
const getPhaseDisplayName = (phase: Phase): string => {
  const names: Record<Phase, string> = {
    freshman: "Freshman",
    sophomore: "Sophomore",
    junior: "Junior",
    senior: "Senior",
    committed: "Committed",
  };
  return names[phase];
};

const getStatusColorClass = (label: StatusLabel): string => {
  const colors: Record<StatusLabel, string> = {
    on_track: "bg-green-500",
    slightly_behind: "bg-yellow-500",
    at_risk: "bg-red-500",
  };
  return colors[label];
};

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchTasksWithStatus(), fetchPhase(), fetchStatusScore()]);
  initialLoadComplete.value = true;
  initializeExpanded();
});
</script>
