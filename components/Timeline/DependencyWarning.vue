<template>
  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
    <!-- Warning header -->
    <div class="flex items-start gap-2 mb-2">
      <svg
        class="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <div class="flex-1">
        <div class="text-xs font-semibold text-yellow-900">
          This task works best after:
        </div>
      </div>
    </div>

    <!-- Prerequisites list -->
    <div class="ml-6 space-y-1">
      <div
        v-for="prerequisite in incompletePrerequisites"
        :key="prerequisite.id"
        class="text-xs text-yellow-800"
      >
        <span class="font-medium">{{ prerequisite.title }}</span>
      </div>
    </div>

    <!-- Note about why it matters -->
    <div
      v-if="task.why_it_matters"
      class="mt-2 ml-6 text-xs text-yellow-700 italic"
    >
      {{ task.why_it_matters }}
    </div>

    <!-- Action buttons -->
    <div class="mt-3 ml-6 flex gap-2">
      <button
        v-if="hasCompletePrerequisiteOption"
        @click="$emit('complete-prerequisite', incompletePrerequisites[0]?.id)"
        class="px-3 py-1 text-xs rounded bg-yellow-200 text-yellow-900 hover:bg-yellow-300 transition font-medium"
      >
        Complete Prerequisite
      </button>
      <button
        @click="$emit('continue-anyway')"
        class="px-3 py-1 text-xs rounded border border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition font-medium"
      >
        Continue Anyway
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TaskWithStatus, Task } from "~/types/timeline";

interface Props {
  task: TaskWithStatus;
  prerequisiteTasks?: Task[];
}

const props = withDefaults(defineProps<Props>(), {
  prerequisiteTasks: () => [],
});

defineEmits<{
  "complete-prerequisite": [taskId: string];
  "continue-anyway": [];
}>();

// Get the list of incomplete prerequisites to display
const incompletePrerequisites = computed(() => {
  if (!props.task.prerequisite_tasks) return [];
  return props.task.prerequisite_tasks.filter(
    (t) =>
      !props.task.athlete_task ||
      props.task.athlete_task.status !== "completed",
  );
});

const hasCompletePrerequisiteOption = computed(
  () => incompletePrerequisites.value.length > 0,
);
</script>
