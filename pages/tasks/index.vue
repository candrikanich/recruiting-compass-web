<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTasks } from '~/composables/useTasks';
import { useAuth } from '~/composables/useAuth';
import type { TaskWithStatus } from '~/types/timeline';

const { user } = useAuth();
const {
  tasksWithStatus,
  loading,
  error,
  fetchTasksWithStatus,
  updateTaskStatus,
  getCompletionStats,
} = useTasks();

const currentGradeLevel = ref(10);
const showSuccessMessage = ref(false);
const expandedTaskId = ref<string | null>(null);

const stats = computed(() => getCompletionStats(currentGradeLevel.value));

const filteredTasks = computed(() =>
  tasksWithStatus.value.filter((t) => t.grade_level === currentGradeLevel.value),
);

const handleToggleTask = async (taskId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';
  try {
    await updateTaskStatus(taskId, newStatus);

    if (newStatus === 'completed') {
      showSuccessMessage.value = true;
      setTimeout(() => {
        showSuccessMessage.value = false;
      }, 3000);
    }

    // Refetch to update UI
    await fetchTasksWithStatus(currentGradeLevel.value);
  } catch (err) {
    console.error('Error updating task status:', err);
  }
};

const toggleTaskDetails = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId;
};

onMounted(async () => {
  // Determine grade level from user profile
  // Default to 10 (sophomore) for now
  // In production, would fetch from user profile
  await fetchTasksWithStatus(currentGradeLevel.value);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Header -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">My Tasks</h1>
        <p class="text-slate-600">Track your recruiting tasks and progress</p>
      </div>
    </div>

    <!-- Progress Counter -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div
        class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
      >
        <div class="text-lg font-semibold text-slate-900 mb-3">
          You've completed {{ stats.completed }} of {{ stats.total }} tasks ({{
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

      <!-- Success Message -->
      <Transition
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
        <p class="text-slate-600 text-lg">No tasks available for this grade level</p>
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
                :checked="task.athlete_task?.status === 'completed'"
                @change="
                  handleToggleTask(task.id, task.athlete_task?.status || 'not_started')
                "
                class="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer flex-shrink-0"
              />

              <!-- Task Info -->
              <div class="flex-1 min-w-0">
                <button
                  type="button"
                  @click="toggleTaskDetails(task.id)"
                  class="w-full text-left hover:opacity-75 transition"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-semibold text-slate-900">{{ task.title }}</h3>
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
                  'bg-green-100 text-green-700': task.athlete_task?.status === 'completed',
                  'bg-yellow-100 text-yellow-700':
                    task.athlete_task?.status === 'in_progress',
                  'bg-slate-100 text-slate-600':
                    !task.athlete_task || task.athlete_task?.status === 'not_started',
                }"
              >
                {{
                  task.athlete_task?.status === 'completed'
                    ? 'Completed'
                    : task.athlete_task?.status === 'in_progress'
                      ? 'In Progress'
                      : 'Not Started'
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
                  <p class="text-sm text-slate-600">{{ task.why_it_matters }}</p>
                </div>
                <div v-if="task.failure_risk">
                  <h4 class="font-semibold text-sm text-slate-900 mb-1">
                    What Can Go Wrong
                  </h4>
                  <p class="text-sm text-slate-600">{{ task.failure_risk }}</p>
                </div>
                <div v-if="task.has_incomplete_prerequisites" class="bg-amber-50 border border-amber-200 rounded p-3">
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
