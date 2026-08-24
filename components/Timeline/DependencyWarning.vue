<template>
  <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
    <!-- Warning header -->
    <div class="mb-2 flex items-start gap-2">
      <svg
        class="mt-0.5 h-4 w-4 shrink-0 text-yellow-600"
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
        class="rounded-sm bg-yellow-200 px-3 py-1 text-xs font-medium text-yellow-900 transition hover:bg-yellow-300"
      >
        Complete Prerequisite
      </button>
      <button
        v-if="showContinueOption"
        @click="$emit('continue-anyway')"
        class="rounded-sm border border-yellow-300 px-3 py-1 text-xs font-medium text-yellow-700 transition hover:bg-yellow-50"
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
  showContinueOption?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  prerequisiteTasks: () => [],
  showContinueOption: true,
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
