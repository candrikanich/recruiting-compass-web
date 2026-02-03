<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useTasks } from "~/composables/useTasks";
import { useAuth } from "~/composables/useAuth";
import { useParentContext } from "~/composables/useParentContext";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";
import { calculateDeadlineInfo } from "~/utils/deadlineHelpers";
import AthleteSwitcher from "~/components/Parent/AthleteSwitcher.vue";
import type { TaskWithStatus } from "~/types/timeline";

const { session } = useAuth();
const {
  linkedAthletes: linkedAccountsList,
  isViewingAsParent,
  currentAthleteId,
} = useParentContext();

// Map LinkedAccount to LinkedAthlete format for AthleteSwitcher
const linkedAthletes = computed(() =>
  linkedAccountsList.value.map(
    (account: (typeof linkedAccountsList.value)[0]) => ({
      id: account.user_id,
      name: account.full_name || account.email,
    }),
  ),
);
const {
  tasksWithStatus,
  loading,
  error,
  fetchTasksWithStatus,
  updateTaskStatus,
  getCompletionStats,
  isTaskLocked,
  lockedTaskIds,
} = useTasks();

const currentGradeLevel = ref(10);
const athleteProfile = ref<{
  full_name: string;
  graduation_year: number | null;
} | null>(null);
const showSuccessMessage = ref(false);
const expandedTaskId = ref<string | null>(null);
const seenLockedTasks = ref<Set<string>>(new Set());

// Filter state
const statusFilter = ref<"all" | "not_started" | "in_progress" | "completed">(
  "all",
);
const urgencyFilter = ref<"all" | "critical" | "urgent" | "upcoming">("all");

// Load filters from localStorage
const loadFilters = () => {
  const athleteId = currentAthleteId.value || session.value?.user?.id;
  if (!athleteId) return;

  const storageKey = `parent-task-filters-${athleteId}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const filters = JSON.parse(stored);
      statusFilter.value = filters.statusFilter || "all";
      urgencyFilter.value = filters.urgencyFilter || "all";
    } catch (e) {
      console.error("Failed to load filters:", e);
    }
  }
};

// Save filters to localStorage
const saveFilters = () => {
  const athleteId = currentAthleteId.value || session.value?.user?.id;
  if (!athleteId) return;

  const storageKey = `parent-task-filters-${athleteId}`;
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      statusFilter: statusFilter.value,
      urgencyFilter: urgencyFilter.value,
    }),
  );
};

const stats = computed(() => getCompletionStats(currentGradeLevel.value));

const filteredTasks = computed(() => {
  let tasks = tasksWithStatus.value.filter(
    (t) => t.grade_level === currentGradeLevel.value,
  );

  // Apply status filter
  if (statusFilter.value !== "all") {
    tasks = tasks.filter((t) => t.athlete_task?.status === statusFilter.value);
  }

  // Apply urgency filter
  if (urgencyFilter.value !== "all") {
    tasks = tasks.filter((t) => {
      const info = calculateDeadlineInfo(t.deadline_date);
      if (urgencyFilter.value === "critical") {
        return info.urgency === "critical" && info.isPastDue;
      } else if (urgencyFilter.value === "urgent") {
        return info.urgency === "urgent" || info.urgency === "critical";
      } else if (urgencyFilter.value === "upcoming") {
        return (
          info.urgency === "upcoming" ||
          info.urgency === "urgent" ||
          info.urgency === "critical"
        );
      }
      return true;
    });
  }

  // Sort: required tasks first, then by deadline urgency, then by days remaining
  return tasks.sort((a, b) => {
    if (a.required !== b.required) {
      return a.required ? -1 : 1;
    }

    const aInfo = calculateDeadlineInfo(a.deadline_date);
    const bInfo = calculateDeadlineInfo(b.deadline_date);

    const urgencyOrder = {
      critical: 0,
      urgent: 1,
      upcoming: 2,
      future: 3,
      none: 4,
    };
    const aUrgencyRank = urgencyOrder[aInfo.urgency] || 4;
    const bUrgencyRank = urgencyOrder[bInfo.urgency] || 4;

    if (aUrgencyRank !== bUrgencyRank) {
      return aUrgencyRank - bUrgencyRank;
    }

    // If same urgency, sort by days remaining (ascending)
    if (aInfo.daysRemaining !== null && bInfo.daysRemaining !== null) {
      return aInfo.daysRemaining - bInfo.daysRemaining;
    }

    // Fallback to alphabetical
    return a.title.localeCompare(b.title);
  });
});

const handleToggleTask = async (taskId: string, currentStatus: string) => {
  if (isViewingAsParent.value) return;

  const newStatus = currentStatus === "completed" ? "not_started" : "completed";

  // Check if task is locked when attempting to complete
  if (newStatus === "completed" && isTaskLocked(taskId)) {
    const task = tasksWithStatus.value.find((t) => t.id === taskId);
    const incompleteTitles = (task?.dependency_task_ids || [])
      .map((depId) => {
        const depTask = tasksWithStatus.value.find((t) => t.id === depId);
        const depAthleteTask = tasksWithStatus.value.find(
          (t) => t.id === depId,
        )?.athlete_task;
        return {
          title: depTask?.title || "Unknown",
          isComplete: depAthleteTask?.status === "completed",
        };
      })
      .filter((dep) => !dep.isComplete)
      .map((dep) => dep.title);

    if (incompleteTitles.length > 0) {
      alert(
        `Cannot complete task. Please complete these prerequisites first:\n\n${incompleteTitles.join("\n")}`,
      );
      return;
    }
  }

  try {
    await updateTaskStatus(taskId, newStatus);

    if (newStatus === "completed") {
      showSuccessMessage.value = true;
      setTimeout(() => {
        showSuccessMessage.value = false;
      }, 3000);
    }

    // Refetch to update UI
    await fetchTasksWithStatus(currentGradeLevel.value);
  } catch (err) {
    console.error("Error updating task status:", err);
    alert(
      "Error updating task: " +
        (err instanceof Error ? err.message : "Unknown error"),
    );
  }
};

const toggleTaskDetails = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId;
};

const handleAthleteChange = (athleteId: string) => {
  loadFilters();
  // Note: The actual athlete switching and data loading would be handled by the route param change
};

onMounted(async () => {
  loadFilters();

  // Calculate grade from graduation year if available
  if (athleteProfile.value?.graduation_year) {
    currentGradeLevel.value = calculateCurrentGrade(
      athleteProfile.value.graduation_year,
    );
  }

  await fetchTasksWithStatus(currentGradeLevel.value);

  // Load seen locked tasks from localStorage
  const athleteId = currentAthleteId.value || session.value?.user?.id;
  if (athleteId) {
    const storageKey = `seen-locked-tasks-${athleteId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        seenLockedTasks.value = new Set(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load seen locked tasks:", e);
      }
    }
  }

  // Auto-expand first locked task not in seenLockedTasks
  const firstUnseenLockedTask = lockedTaskIds.value.find(
    (taskId) => !seenLockedTasks.value.has(taskId),
  );
  if (firstUnseenLockedTask && !expandedTaskId.value) {
    expandedTaskId.value = firstUnseenLockedTask;
    seenLockedTasks.value.add(firstUnseenLockedTask);

    // Save to localStorage
    const athleteId = currentAthleteId.value || session.value?.user?.id;
    if (athleteId) {
      const storageKey = `seen-locked-tasks-${athleteId}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(seenLockedTasks.value)),
      );
    }
  }
});

// Watch for filter changes and save
const onStatusFilterChange = () => {
  saveFilters();
};

const onUrgencyFilterChange = () => {
  saveFilters();
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Parent Context Banner -->
    <div v-if="isViewingAsParent" class="bg-blue-50 border-b-2 border-blue-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-3">
        <p class="text-sm text-blue-700 font-medium">
          👁 Viewing {{ athleteProfile?.full_name }}'s Tasks (Read-Only)
        </p>
      </div>
    </div>

    <!-- Header -->
    <div
      class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200"
    >
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          {{
            isViewingAsParent
              ? `${athleteProfile?.full_name}'s Tasks`
              : "My Tasks"
          }}
        </h1>
        <p class="text-slate-600">
          {{
            isViewingAsParent
              ? "Monitor task progress and upcoming deadlines"
              : "Track your recruiting tasks and progress"
          }}
        </p>
      </div>
    </div>

    <!-- Athlete Switcher (Parent view only) -->
    <div
      v-if="isViewingAsParent && linkedAthletes.length > 0"
      class="max-w-4xl mx-auto px-4 sm:px-6 pt-6"
    >
      <AthleteSwitcher
        :linked-athletes="linkedAthletes"
        :current-athlete-id="currentAthleteId || session?.user?.id || ''"
        @athlete-changed="handleAthleteChange"
      />
    </div>

    <!-- Progress Counter -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div
        class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-4"
      >
        <div class="text-lg font-semibold text-slate-900 mb-3">
          {{
            isViewingAsParent ? `${athleteProfile?.full_name} has` : `You've`
          }}
          completed {{ stats.completed }} of {{ stats.total }} tasks ({{
            Math.round(stats.percentComplete)
          }}%)
        </div>
        <!-- Progress Bar -->
        <div class="w-full bg-slate-200 rounded-full h-3">
          <div
            class="bg-blue-600 h-3 rounded-full transition-all duration-500"
            :style="{ width: `${stats.percentComplete}%` }"
          />
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div class="grid grid-cols-2 gap-4">
          <!-- Status Filter -->
          <div>
            <label
              for="status-filter"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Status
            </label>
            <select
              id="status-filter"
              v-model="statusFilter"
              @change="onStatusFilterChange"
              class="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              data-testid="status-filter"
            >
              <option value="all">All</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <!-- Urgency Filter -->
          <div>
            <label
              for="urgency-filter"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Deadline Urgency
            </label>
            <select
              id="urgency-filter"
              v-model="urgencyFilter"
              @change="onUrgencyFilterChange"
              class="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              data-testid="urgency-filter"
            >
              <option value="all">All</option>
              <option value="critical">Overdue / Due Soon</option>
              <option value="urgent">Due This Week</option>
              <option value="upcoming">Due In 2 Weeks</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Success Message (Athlete only) -->
      <Transition
        v-if="!isViewingAsParent"
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform opacity-0 translate-y-2"
        enter-to-class="transform opacity-100 translate-y-0"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="transform opacity-100 translate-y-0"
        leave-to-class="transform opacity-0 translate-y-2"
      >
        <div
          v-if="showSuccessMessage"
          class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <p class="text-green-700 font-semibold">Great job! 🎉</p>
        </div>
      </Transition>
    </div>

    <!-- Task List -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div
          v-for="i in 5"
          :key="i"
          class="h-20 bg-white rounded-lg animate-pulse"
        />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredTasks.length === 0"
        class="bg-white border border-slate-200 rounded-lg p-8 text-center"
      >
        <p class="text-slate-600 text-lg">
          No tasks available for this grade level
        </p>
      </div>

      <!-- Tasks -->
      <div v-else class="space-y-3">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          data-testid="task-item"
          class="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition"
        >
          <div class="p-4">
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <input
                type="checkbox"
                :data-testid="`task-checkbox-${task.id}`"
                class="task-checkbox"
                :checked="task.athlete_task?.status === 'completed'"
                :disabled="isViewingAsParent || isTaskLocked(task.id)"
                @change="
                  handleToggleTask(
                    task.id,
                    task.athlete_task?.status || 'not_started',
                  )
                "
                :class="[
                  'mt-1 w-5 h-5 text-blue-600 rounded flex-shrink-0',
                  isViewingAsParent || isTaskLocked(task.id)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer',
                ]"
                :title="
                  isViewingAsParent
                    ? 'Parents can view tasks but cannot mark them complete'
                    : isTaskLocked(task.id)
                      ? 'Complete prerequisites to unlock this task'
                      : 'Mark task complete'
                "
              />

              <!-- Task Info -->
              <div class="flex-1 min-w-0">
                <button
                  type="button"
                  :data-testid="`task-title-${task.id}`"
                  @click="toggleTaskDetails(task.id)"
                  class="w-full text-left hover:opacity-75 transition"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <h3
                      class="font-semibold"
                      :class="{
                        'text-slate-900': !isTaskLocked(task.id),
                        'text-slate-400':
                          isTaskLocked(task.id) &&
                          task.athlete_task?.status !== 'completed',
                        'text-slate-500 line-through':
                          task.athlete_task?.status === 'completed',
                      }"
                    >
                      {{ task.title }}
                    </h3>
                    <span
                      v-if="isTaskLocked(task.id)"
                      class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0"
                    >
                      🔒 Locked
                    </span>
                    <span
                      v-if="task.required"
                      class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0"
                    >
                      Required
                    </span>
                  </div>
                  <p
                    v-if="task.description"
                    class="text-sm text-slate-600 line-clamp-2"
                  >
                    {{ task.description }}
                  </p>
                </button>
              </div>

              <!-- Status Badge -->
              <div
                class="text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                :class="{
                  'bg-green-100 text-green-700':
                    task.athlete_task?.status === 'completed',
                  'bg-yellow-100 text-yellow-700':
                    task.athlete_task?.status === 'in_progress',
                  'bg-slate-100 text-slate-600':
                    !task.athlete_task ||
                    task.athlete_task?.status === 'not_started',
                }"
              >
                {{
                  task.athlete_task?.status === "completed"
                    ? "Completed"
                    : task.athlete_task?.status === "in_progress"
                      ? "In Progress"
                      : "Not Started"
                }}
              </div>
            </div>

            <!-- Expandable Details -->
            <Transition
              enter-active-class="transition duration-200"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition duration-200"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0"
            >
              <div
                v-if="expandedTaskId === task.id"
                class="mt-4 pt-4 border-t border-slate-200 space-y-3"
              >
                <div v-if="task.why_it_matters">
                  <h4 class="font-semibold text-sm text-slate-900 mb-1">
                    Why It Matters
                  </h4>
                  <p class="text-sm text-slate-600">
                    {{ task.why_it_matters }}
                  </p>
                </div>
                <div v-if="task.failure_risk">
                  <h4 class="font-semibold text-sm text-slate-900 mb-1">
                    What Can Go Wrong
                  </h4>
                  <p class="text-sm text-slate-600">{{ task.failure_risk }}</p>
                </div>
                <div
                  v-if="isTaskLocked(task.id)"
                  class="bg-red-50 border border-red-200 rounded p-3"
                >
                  <h4 class="font-semibold text-sm text-red-900 mb-2">
                    🔒 Complete These First
                  </h4>
                  <p class="text-sm text-red-800 mb-2">
                    This task is locked until you complete:
                  </p>
                  <ul
                    class="text-sm text-red-800 list-disc list-inside space-y-1"
                  >
                    <li
                      v-for="prereq in task.prerequisite_tasks"
                      :key="prereq.id"
                    >
                      {{ prereq.title }}
                    </li>
                  </ul>
                </div>
                <div
                  v-else-if="task.has_incomplete_prerequisites"
                  class="bg-amber-50 border border-amber-200 rounded p-3"
                >
                  <h4 class="font-semibold text-sm text-amber-900 mb-1">
                    Prerequisites
                  </h4>
                  <p class="text-sm text-amber-800">
                    Complete the following tasks first:
                  </p>
                  <ul class="text-sm text-amber-800 list-disc list-inside mt-2">
                    <li
                      v-for="prereq in task.prerequisite_tasks"
                      :key="prereq.id"
                    >
                      {{ prereq.title }}
                    </li>
                  </ul>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
