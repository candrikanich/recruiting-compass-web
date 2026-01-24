<template>
  <!-- Empty state -->
  <div
    v-if="tasks.length === 0 && showEmpty"
    class="text-center py-8 text-slate-500"
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

interface Props {
  tasks: TaskWithStatus[];
  showEmpty?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  filterCategory?: TaskCategory | null;
  filterStatus?: TaskStatus | null;
}

const props = withDefaults(defineProps<Props>(), {
  showEmpty: true,
  showCategory: true,
  showStatus: true,
  filterCategory: null,
  filterStatus: null,
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

  // Sort by priority: required tasks first, then alphabetically
  result = [...result].sort((a, b) => {
    // Required tasks first
    if (a.required && !b.required) return -1;
    if (!a.required && b.required) return 1;

    // Then alphabetically by title
    return a.title.localeCompare(b.title);
  });

  return result;
});
</script>
