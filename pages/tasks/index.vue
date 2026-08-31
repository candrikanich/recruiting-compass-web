<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useTasks } from "~/composables/useTasks";
import { useAuth } from "~/composables/useAuth";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useAppToast } from "~/composables/useAppToast";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";
import { calculateDeadlineInfo } from "~/utils/deadlineHelpers";
import AthleteSwitcher from "~/components/Parent/AthleteSwitcher.vue";
import DeadlineBadge from "~/components/Timeline/DeadlineBadge.vue";
import type { TaskWithStatus } from "~/types/timeline";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("Tasks");

useHead({ title: "My Tasks" });

const { session } = useAuth();
const { showToast } = useAppToast();
// Parent context comes from useFamilyCtx (inject('activeFamily') falling back
// to the shared useFamilyContext singleton) — the same shared instance every
// other page/composable reads, instead of a standalone useActiveFamily() call
// that would desync from athlete switches made elsewhere in the app.
const {
  isViewingAsParent,
  activeAthleteId: currentAthleteId,
  parentAccessibleFamilies,
  switchAthlete,
} = useFamilyCtx();

// Map accessible families to AthleteSwitcher's {id,name} shape, deduped by athlete.
const linkedAthletes = computed(() => {
  const seen = new Set<string>();
  const list: { id: string; name: string }[] = [];
  for (const f of parentAccessibleFamilies.value) {
    if (f.athleteId && !seen.has(f.athleteId)) {
      seen.add(f.athleteId);
      list.push({ id: f.athleteId, name: f.athleteName || "Athlete" });
    }
  }
  return list;
});
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
      logger.error("Failed to load filters", e);
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

const taskCheckboxTitle = (taskId: string): string => {
  if (isViewingAsParent.value)
    return "Parents can view tasks but cannot mark them complete";
  if (isTaskLocked(taskId)) return "Complete prerequisites to unlock this task";
  return "Mark task complete";
};

// title attributes are unreliably announced by screen readers, so the checkbox
// needs its own accessible name naming the task it belongs to.
const taskCheckboxAriaLabel = (task: TaskWithStatus): string =>
  task.athlete_task?.status === "completed"
    ? `Mark ${task.title} as incomplete`
    : `Mark ${task.title} as complete`;

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
      showToast(
        `Complete these prerequisites first: ${incompleteTitles.join(", ")}`,
        "warning",
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
    await fetchTasksWithStatus(
      currentGradeLevel.value,
      isViewingAsParent.value ? currentAthleteId.value || undefined : undefined,
    );
  } catch (err) {
    logger.error("Error updating task status", err);
    showToast(
      "Something went wrong updating this task. Please try again.",
      "error",
    );
  }
};

const toggleTaskDetails = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId;
};

const handleAthleteChange = async (athleteId: string) => {
  // switchAthlete sets currentAthleteId, which fires the watch below and
  // fetches the tasks — do NOT fetch again here or every switch renders the
  // task list twice (churn + retained detached DOM).
  await switchAthlete(athleteId);
  loadFilters();
};

// useActiveFamily resolves the parent's active athlete asynchronously after
// mount; refetch the athlete's tasks once it lands (or changes). This is the
// single fetch path for athlete switches.
watch(currentAthleteId, async (athleteId) => {
  if (isViewingAsParent.value && athleteId) {
    await fetchTasksWithStatus(currentGradeLevel.value, athleteId);
  }
});

onMounted(async () => {
  loadFilters();

  // Calculate grade from graduation year if available
  if (athleteProfile.value?.graduation_year) {
    currentGradeLevel.value = calculateCurrentGrade(
      athleteProfile.value.graduation_year,
    );
  }

  await fetchTasksWithStatus(
    currentGradeLevel.value,
    isViewingAsParent.value ? currentAthleteId.value || undefined : undefined,
  );

  // Load seen locked tasks from localStorage
  const athleteId = currentAthleteId.value || session.value?.user?.id;
  if (athleteId) {
    const storageKey = `seen-locked-tasks-${athleteId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        seenLockedTasks.value = new Set(JSON.parse(stored));
      } catch (e) {
        logger.error("Failed to load seen locked tasks", e);
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
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Parent Context Banner -->
    <div v-if="isViewingAsParent" class="border-b-2 border-blue-200 bg-blue-50">
      <div class="mx-auto max-w-4xl px-4 py-3 sm:px-6">
        <p class="text-sm font-medium text-blue-700">
          👁 Viewing {{ athleteProfile?.full_name }}'s Tasks (Read-Only)
        </p>
      </div>
    </div>

    <!-- Header -->
    <div
      class="border-b border-slate-200 bg-linear-to-r from-slate-50 to-blue-50"
    >
      <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">
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
      class="mx-auto max-w-4xl px-4 pt-6 sm:px-6"
    >
      <AthleteSwitcher
        :linked-athletes="linkedAthletes"
        :current-athlete-id="currentAthleteId || session?.user?.id || ''"
        @athlete-changed="handleAthleteChange"
      />
    </div>

    <!-- Progress Counter -->
    <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div
        class="mb-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <div class="mb-3 text-lg font-semibold text-slate-900">
          {{
            isViewingAsParent ? `${athleteProfile?.full_name} has` : `You've`
          }}
          completed {{ stats.completed }} of {{ stats.total }} tasks ({{
            Math.round(stats.percentComplete)
          }}%)
        </div>
        <!-- Progress Bar -->
        <div class="h-3 w-full rounded-full bg-slate-200">
          <div
            class="h-3 rounded-full bg-blue-600 transition-all duration-500"
            :style="{ width: `${stats.percentComplete}%` }"
          />
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div class="grid grid-cols-2 gap-4">
          <!-- Status Filter -->
          <div>
            <label
              for="status-filter"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="status-filter"
              v-model="statusFilter"
              @change="onStatusFilterChange"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:ring-blue-500"
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
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Deadline Urgency
            </label>
            <select
              id="urgency-filter"
              v-model="urgencyFilter"
              @change="onUrgencyFilterChange"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:ring-blue-500"
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
          role="status"
          aria-live="polite"
          data-testid="task-success-message"
          class="mt-4 rounded-lg border border-brand-emerald-200 bg-brand-emerald-50 p-4"
        >
          <p class="font-semibold text-brand-emerald-700">Great job! 🎉</p>
        </div>
      </Transition>
    </div>

    <!-- Task List -->
    <main class="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
      <!-- Loading State — only on the initial load. On athlete-switch refetch
           the list below stays mounted (keyed v-for diffs) instead of the whole
           list unmounting/remounting, which stranded Transition transitionend
           handlers on detached DOM and leaked memory per switch. -->
      <div v-if="loading && filteredTasks.length === 0" class="space-y-4">
        <div
          v-for="i in 5"
          :key="i"
          class="h-20 animate-pulse rounded-lg bg-white"
        />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="rounded-lg border border-red-200 bg-red-50 p-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <DesignSystemEmptyState
        v-else-if="filteredTasks.length === 0"
        title="No tasks yet"
        description="Phase-based recruiting tasks guide your next steps"
      >
        <template #icon>
          <UIcon name="i-heroicons-check-circle" class="h-8 w-8 text-brand-slate-400" />
        </template>
        <template #action>
          <p class="text-sm text-brand-slate-500">
            Your tasks appear as you progress
          </p>
        </template>
      </DesignSystemEmptyState>

      <!-- Tasks -->
      <div v-else class="space-y-3">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          data-testid="task-item"
          class="overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:shadow-md"
        >
          <div class="p-4">
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <span class="shrink-0" :title="taskCheckboxTitle(task.id)">
                <DesignSystemFormAnimatedCheck
                  size="sm"
                  :data-testid="`task-checkbox-${task.id}`"
                  :model-value="task.athlete_task?.status === 'completed'"
                  :disabled="isViewingAsParent || isTaskLocked(task.id)"
                  :aria-label="taskCheckboxAriaLabel(task)"
                  @update:model-value="
                    handleToggleTask(
                      task.id,
                      task.athlete_task?.status || 'not_started',
                    )
                  "
                />
              </span>

              <!-- Task Info -->
              <div class="min-w-0 flex-1">
                <button
                  type="button"
                  :data-testid="`task-title-${task.id}`"
                  :aria-expanded="expandedTaskId === task.id"
                  @click="toggleTaskDetails(task.id)"
                  class="w-full text-left transition hover:opacity-75"
                >
                  <div class="mb-1 flex items-center gap-2">
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
                      class="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                    >
                      🔒 Locked
                    </span>
                    <span
                      v-if="task.required"
                      class="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                    >
                      Required
                    </span>
                    <DeadlineBadge
                      :deadline-date="task.deadline_date"
                      :is-completed="task.athlete_task?.status === 'completed'"
                    />
                  </div>
                  <p
                    v-if="task.description"
                    class="line-clamp-2 text-sm text-slate-600"
                  >
                    {{ task.description }}
                  </p>
                </button>
              </div>

              <!-- Status Badge -->
              <div
                class="shrink-0 rounded-full px-2 py-1 text-xs whitespace-nowrap"
                :class="{
                  'bg-brand-emerald-100 text-brand-emerald-700':
                    task.athlete_task?.status === 'completed',
                  'bg-brand-orange-100 text-brand-orange-700':
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
                class="mt-4 space-y-3 border-t border-slate-200 pt-4"
              >
                <div v-if="task.why_it_matters">
                  <h4 class="mb-1 text-sm font-semibold text-slate-900">
                    Why It Matters
                  </h4>
                  <p class="text-sm text-slate-600">
                    {{ task.why_it_matters }}
                  </p>
                </div>
                <div v-if="task.failure_risk">
                  <h4 class="mb-1 text-sm font-semibold text-slate-900">
                    What Can Go Wrong
                  </h4>
                  <p class="text-sm text-slate-600">{{ task.failure_risk }}</p>
                </div>
                <div
                  v-if="isTaskLocked(task.id)"
                  class="rounded-sm border border-red-200 bg-red-50 p-3"
                >
                  <h4 class="mb-2 text-sm font-semibold text-red-900">
                    🔒 Complete These First
                  </h4>
                  <p class="mb-2 text-sm text-red-800">
                    This task is locked until you complete:
                  </p>
                  <ul
                    class="list-inside list-disc space-y-1 text-sm text-red-800"
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
                  class="rounded-sm border border-amber-200 bg-amber-50 p-3"
                >
                  <h4 class="mb-1 text-sm font-semibold text-amber-900">
                    Prerequisites
                  </h4>
                  <p class="text-sm text-amber-800">
                    Complete the following tasks first:
                  </p>
                  <ul class="mt-2 list-inside list-disc text-sm text-amber-800">
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
