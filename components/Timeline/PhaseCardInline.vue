<template>
  <div
    class="rounded-2xl bg-white shadow-xs transition-shadow hover:shadow-md"
    :class="[
      isCompleted
        ? 'border border-emerald-200 opacity-60'
        : 'border border-slate-200',
    ]"
  >
    <!-- Card Header: Always visible -->
    <button
      :aria-expanded="expanded"
      @click="$emit('toggle')"
      class="w-full p-6 text-left"
    >
      <div class="flex items-center gap-4">
        <!-- Completion status icon (leading) -->
        <div class="h-8 w-8 shrink-0">
          <svg
            v-if="percentComplete === 100"
            class="h-8 w-8 text-emerald-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path
              fill="white"
              d="M10 14.59l-3.3-3.3-1.4 1.42L10 17.41l9-9-1.41-1.41z"
            />
          </svg>
          <svg
            v-else-if="percentComplete > 0"
            class="h-8 w-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" stroke-width="2" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4"
              opacity="0.5"
            />
          </svg>
          <svg
            v-else
            class="h-8 w-8 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" stroke-width="2" />
          </svg>
        </div>

        <!-- Title + theme -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-xl font-bold text-slate-900">{{ title }}</h3>
            <span
              v-if="isCurrentPhase"
              class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Current
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-600">{{ theme }}</p>
        </div>

        <!-- Stats -->
        <div class="shrink-0 text-right">
          <div class="text-2xl font-bold text-slate-900">
            {{ completedCount }}/{{ totalCount }}
          </div>
          <div class="text-sm text-slate-500">tasks</div>
        </div>

        <!-- Expand chevron -->
        <svg
          :class="{ 'rotate-180': expanded }"
          class="h-6 w-6 shrink-0 text-slate-400 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>

      <!-- Progress bar + percent -->
      <div class="mt-4 flex items-center gap-3">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full transition-all duration-300"
            :class="
              isCurrentPhase
                ? 'bg-linear-to-r from-blue-500 to-emerald-500'
                : 'bg-slate-300'
            "
            :style="{ width: `${percentComplete}%` }"
          />
        </div>
        <span class="text-xs font-semibold text-slate-500 tabular-nums">
          {{ percentComplete }}%
        </span>
      </div>
    </button>

    <!-- Expandable Task List -->
    <Transition name="slide-fade">
      <div v-if="expanded" class="border-t border-slate-200">
        <div class="p-6">
          <TaskList
            :tasks="tasks"
            :phase-progress="percentComplete"
            @task-toggle="$emit('task-toggle', $event)"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TaskWithStatus } from "~/types/timeline";
import TaskList from "~/components/Timeline/TaskList.vue";

interface Props {
  phase: string;
  title: string;
  theme: string;
  tasks: TaskWithStatus[];
  isCurrentPhase: boolean;
  isCompleted?: boolean;
  expanded: boolean;
  milestoneProgress?: any;
  completionCount?: { completed: number; total: number };
}

const props = withDefaults(defineProps<Props>(), {
  isCompleted: false,
  completionCount: undefined,
});

defineEmits<{
  toggle: [];
  "task-toggle": [taskId: string];
}>();

// Computed properties
const completedCount = computed(() => {
  if (props.completionCount) {
    return props.completionCount.completed;
  }
  return props.tasks.filter((t) => t.athlete_task?.status === "completed")
    .length;
});

const totalCount = computed(() => {
  if (props.completionCount) {
    return props.completionCount.total;
  }
  return props.tasks.length;
});

const percentComplete = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((completedCount.value / totalCount.value) * 100);
});
</script>

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
