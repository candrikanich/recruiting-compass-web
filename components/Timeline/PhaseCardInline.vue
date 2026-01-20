<template>
  <div
    class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
    :class="[
      isCompleted ? 'border border-emerald-200 opacity-60' : 'border border-slate-200'
    ]"
  >
    <!-- Card Header: Always visible -->
    <button @click="$emit('toggle')" class="w-full p-6 text-left">
      <div class="flex items-start justify-between gap-4">
        <!-- Left: Phase title + theme -->
        <div class="flex-1">
          <h3 class="text-xl font-bold text-slate-900">{{ title }}</h3>
          <p class="text-slate-600 text-sm mt-1">{{ theme }}</p>
        </div>

        <!-- Right: Completion icon + stats + chevron -->
        <div class="flex items-center gap-4">
          <!-- Completion status icon -->
          <div class="w-8 h-8 flex-shrink-0">
            <svg v-if="percentComplete === 100" class="w-8 h-8 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path fill="white" d="M10 14.59l-3.3-3.3-1.4 1.42L10 17.41l9-9-1.41-1.41z" />
            </svg>
            <svg v-else-if="percentComplete > 0" class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" opacity="0.5" />
            </svg>
            <svg v-else class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2" />
            </svg>
          </div>

          <!-- Stats -->
          <div class="text-right">
            <div class="text-2xl font-bold text-slate-900">{{ completedCount }}/{{ totalCount }}</div>
            <div class="text-slate-500 text-sm">tasks</div>
          </div>

          <!-- Expand chevron -->
          <svg
            :class="{ 'rotate-180': expanded }"
            class="w-6 h-6 text-slate-400 transition-transform flex-shrink-0 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          class="h-full transition-all duration-300"
          :class="isCurrentPhase ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : 'bg-slate-300'"
          :style="{ width: `${percentComplete}%` }"
        />
      </div>

      <!-- Current phase indicator -->
      <div v-if="isCurrentPhase" class="mt-2 flex items-center gap-2">
        <span class="inline-block w-2 h-2 bg-emerald-500 rounded-full" />
        <span class="text-xs font-medium text-emerald-700">Current Phase</span>
      </div>
    </button>

    <!-- Expandable Task List -->
    <Transition name="slide-fade">
      <div v-if="expanded" class="border-t border-slate-200">
        <div class="p-6">
          <TaskList :tasks="tasks" @task-toggle="$emit('task-toggle', $event)" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TaskWithStatus } from '~/types/timeline'
import TaskList from '~/components/Timeline/TaskList.vue'

interface Props {
  phase: string
  title: string
  theme: string
  tasks: TaskWithStatus[]
  isCurrentPhase: boolean
  isCompleted?: boolean
  expanded: boolean
  milestoneProgress?: any
  completionCount?: { completed: number; total: number }
}

const props = withDefaults(defineProps<Props>(), {
  isCompleted: false,
  completionCount: undefined
})

defineEmits<{
  toggle: []
  'task-toggle': [taskId: string]
}>()

// Computed properties
const completedCount = computed(() => {
  if (props.completionCount) {
    return props.completionCount.completed
  }
  return props.tasks.filter(t => t.athlete_task?.status === 'completed').length
})

const totalCount = computed(() => {
  if (props.completionCount) {
    return props.completionCount.total
  }
  return props.tasks.length
})

const percentComplete = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})
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
