<script setup lang="ts">
import { computed } from "vue";
import { calculateDeadlineInfo, formatDeadlineDate } from "~/utils/deadlineHelpers";
import type { DeadlineInfo } from "~/types/timeline";

interface Props {
  deadlineDate: string | null;
  isCompleted: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deadlineDate: null,
  isCompleted: false,
});

const deadlineInfo = computed<DeadlineInfo>(() => {
  return calculateDeadlineInfo(props.deadlineDate);
});

const formattedDate = computed<string>(() => {
  return formatDeadlineDate(props.deadlineDate);
});

const shouldRender = computed<boolean>(() => {
  return !props.isCompleted && props.deadlineDate !== null && deadlineInfo.value.urgency !== "none";
});

const badgeClasses = computed<string>(() => {
  const baseClasses =
    "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium";

  switch (deadlineInfo.value.urgency) {
    case "critical":
      return `${baseClasses} bg-red-100 text-red-800`;
    case "urgent":
      return `${baseClasses} bg-orange-100 text-orange-800`;
    case "upcoming":
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case "future":
      return `${baseClasses} bg-gray-100 text-gray-800`;
    default:
      return baseClasses;
  }
});

const showAlertIcon = computed<boolean>(() => {
  return deadlineInfo.value.urgency === "critical";
});

const tooltipText = computed<string>(() => {
  const label = deadlineInfo.value.urgencyLabel;
  const formatted = formattedDate.value;
  if (label && formatted) {
    return `${label} - ${formatted}`;
  }
  return formatted || label || "";
});
</script>

<template>
  <div
    v-if="shouldRender"
    data-testid="deadline-badge"
    :class="badgeClasses"
    :title="tooltipText"
  >
    <svg
      v-if="showAlertIcon"
      data-testid="alert-icon"
      class="w-3 h-3"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fill-rule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clip-rule="evenodd"
      />
    </svg>
    <span>{{ formattedDate }}</span>
  </div>
</template>
