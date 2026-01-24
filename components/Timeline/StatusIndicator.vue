<template>
  <span
    class="inline-block px-2 py-1 text-xs rounded-full"
    :class="statusColorClass"
  >
    <template v-if="showLabel">{{ formatStatus(status) }}</template>
    <template v-else>{{ shortLabel }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getTaskStatusColor, formatStatus } from "~/utils/taskHelpers";
import type { TaskStatus } from "~/types/timeline";

interface Props {
  status: TaskStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  showLabel: true,
});

const statusColorClass = computed(() => getTaskStatusColor(props.status));

const shortLabel = computed(() => {
  const labels: Record<TaskStatus, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    completed: "✓ Done",
    skipped: "Skipped",
  };
  return labels[props.status];
});
</script>
