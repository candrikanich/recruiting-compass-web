<template>
  <!-- Empty state -->
  <div
    v-if="tasks.length === 0 && showEmpty"
    class="py-8 text-center text-slate-500"
  >
    <p class="text-sm">No tasks available for this phase</p>
  </div>

  <!-- Task list -->
  <div v-else class="space-y-3">
    <TaskItem
      v-for="task in filteredAndSortedTasks"
      :key="task.id"
      :task="task"
      :show-category="showCategory"
      :show-status="showStatus"
      :phase-progress="phaseProgress"
      @toggle-complete="$emit('task-toggle', $event)"
      @complete-prerequisite="$emit('task-toggle', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  TaskWithStatus,
  TaskCategory,
  TaskStatus,
} from "~/types/timeline";
import TaskItem from "~/components/Timeline/TaskItem.vue";
import { compareTimelineTasks } from "~/utils/taskSort";

interface Props {
  tasks: TaskWithStatus[];
  showEmpty?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  filterCategory?: TaskCategory | null;
  filterStatus?: TaskStatus | null;
  phaseProgress?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showEmpty: true,
  showCategory: true,
  showStatus: true,
  filterCategory: null,
  filterStatus: null,
  phaseProgress: 0,
});

defineEmits<{
  "task-toggle": [taskId: string];
}>();

const filteredAndSortedTasks = computed(() => {
  let result = props.tasks;

  // Filter by category if provided
  if (props.filterCategory) {
    result = result.filter((t) => t.category === props.filterCategory);
  }

  // Filter by status if provided
  if (props.filterStatus) {
    result = result.filter(
      (t) => t.athlete_task?.status === props.filterStatus,
    );
  }

  result = [...result].sort(compareTimelineTasks);

  return result;
});
</script>
