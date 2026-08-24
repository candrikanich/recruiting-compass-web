<template>
  <div
    :data-task-id="task.id"
    class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
  >
    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="isCompleted"
      :disabled="isViewingAsParent || isLocked"
      @change="$emit('toggle-complete', task.id)"
      :class="[
        'mt-1 h-4 w-4 shrink-0 rounded-sm border-slate-300 text-blue-600 transition',
        isViewingAsParent || isLocked
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer',
      ]"
      :title="
        isViewingAsParent
          ? 'Parents can view tasks but cannot mark them complete'
          : isLocked
            ? 'Complete prerequisites to unlock this task'
            : 'Mark task complete'
      "
    />

    <!-- Task content -->
    <div
      class="min-w-0 flex-1"
      :class="{ 'cursor-pointer': hasDetail }"
      @click="toggleExpand"
    >
      <!-- Title and status indicator -->
      <div class="flex items-start gap-2">
        <div
          class="flex-1 text-sm font-medium transition-colors"
          :class="{
            'text-slate-500 line-through': isCompleted,
            'text-slate-400': isLocked && !isCompleted,
            'text-slate-900': !isCompleted && !isLocked,
          }"
        >
          {{ task.title }}
        </div>

        <!-- Lock badge -->
        <span
          v-if="isLocked"
          class="inline-block shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
        >
          🔒 Locked
        </span>

        <!-- Deadline badge -->
        <DeadlineBadge
          :deadline-date="task.deadline_date"
          :is-completed="isCompleted"
        />

        <!-- Recovery task indicator -->
        <span
          v-if="task.athlete_task?.is_recovery_task"
          class="inline-block shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700"
        >
          Recovery
        </span>

        <!-- Category badge -->
        <span
          v-if="showCategory"
          class="inline-block shrink-0 rounded-full px-2 py-0.5 text-xs"
          :class="getCategoryColor(task.category)"
        >
          {{ formatCategory(task.category) }}
        </span>

        <!-- Required indicator -->
        <span
          v-if="task.required"
          class="inline-block shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
        >
          Required
        </span>

        <!-- Completed badge -->
        <span
          v-if="isCompleted"
          class="inline-block shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
        >
          ✓ Done
        </span>

        <!-- Expand button (task detail + dependency warnings) -->
        <button
          v-if="showChevron"
          @click.stop="expanded = !expanded"
          class="shrink-0 rounded-sm p-1 transition hover:bg-slate-200"
          :title="expanded ? 'Collapse details' : 'Expand details'"
        >
          <svg
            :class="{ 'rotate-180': expanded }"
            class="h-4 w-4 text-slate-400 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      </div>

      <!-- Description (revealed on expand) -->
      <div
        v-if="task.description && expanded"
        class="mt-1 text-sm text-slate-600"
      >
        {{ task.description }}
      </div>

      <!-- Status badges row (non-completed states + prerequisites) -->
      <div
        v-if="
          (showStatus && task.athlete_task && !isCompleted) ||
          task.has_incomplete_prerequisites
        "
        class="mt-2 flex flex-wrap items-center gap-2"
      >
        <StatusIndicator
          v-if="showStatus && task.athlete_task && !isCompleted"
          :status="task.athlete_task.status"
          size="sm"
          :show-label="true"
        />

        <span
          v-if="task.has_incomplete_prerequisites"
          class="inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700"
        >
          ⚠ Prerequisites pending
        </span>
      </div>

      <!-- Guidance (revealed on expand) -->
      <div
        v-if="task.why_it_matters && !isCompleted && expanded"
        class="mt-2 rounded-r border-l-2 border-blue-200 bg-blue-50 py-2 pl-3"
      >
        <div class="mb-0.5 text-xs font-semibold text-blue-900">
          Why It Matters
        </div>
        <div class="text-xs text-blue-800">{{ task.why_it_matters }}</div>
      </div>

      <!-- Late-phase nudge for incomplete tasks (revealed on expand) -->
      <div
        v-if="showFailureRisk && task.failure_risk && expanded"
        class="mt-2 rounded-r border-l-2 border-amber-300 bg-amber-50 py-2 pl-3"
      >
        <div class="mb-0.5 text-xs font-semibold text-amber-900">
          Don't Miss This
        </div>
        <div class="text-xs text-amber-800">{{ task.failure_risk }}</div>
      </div>

      <!-- Expandable dependency warning (still behind toggle) -->
      <Transition name="slide-fade">
        <div
          v-if="expanded && task.has_incomplete_prerequisites"
          class="mt-3 border-t border-slate-100 pt-3"
        >
          <DependencyWarning
            :task="task"
            :show-continue-option="!isLocked"
            @complete-prerequisite="$emit('complete-prerequisite', $event)"
            @continue-anyway="$emit('continue-anyway')"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from "vue";
import { getCategoryColor, formatCategory } from "~/utils/taskHelpers";
import type { TaskWithStatus } from "~/types/timeline";
import StatusIndicator from "~/components/Timeline/StatusIndicator.vue";
import DependencyWarning from "~/components/Timeline/DependencyWarning.vue";
import DeadlineBadge from "~/components/Timeline/DeadlineBadge.vue";
import { useActiveFamily } from "~/composables/useActiveFamily";
import { useFamilyContext } from "~/composables/useFamilyContext";

interface Props {
  task: TaskWithStatus;
  expandable?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  isLocked?: boolean;
  phaseProgress?: number;
}

const props = withDefaults(defineProps<Props>(), {
  expandable: true,
  showCategory: true,
  showStatus: true,
  isLocked: false,
  phaseProgress: 0,
});

defineEmits<{
  "toggle-complete": [taskId: string];
  "complete-prerequisite": [taskId: string];
  "continue-anyway": [];
}>();

const expanded = ref(false);
// Try the page-provided family context first, falling back to the shared
// singleton — same precedent as useEvents.ts — so a bare mount (e.g. tests)
// still resolves rather than throwing on a missing provider.
const injectedFamily =
  inject<ReturnType<typeof useActiveFamily>>("activeFamily");
const activeFamily = injectedFamily || useFamilyContext();

const isCompleted = computed(
  () => props.task.athlete_task?.status === "completed",
);
const isViewingAsParent = computed(() => activeFamily.isViewingAsParent.value);
const showFailureRisk = computed(
  () => !isCompleted.value && props.phaseProgress >= 75,
);

// Detail the row can reveal on tap: description + the guidance callouts.
// Mirrors iOS PhaseCardTaskRow's collapse-by-default behavior.
const hasDetail = computed(
  () =>
    !!props.task.description ||
    (!!props.task.why_it_matters && !isCompleted.value) ||
    (showFailureRisk.value && !!props.task.failure_risk),
);

const showChevron = computed(
  () =>
    hasDetail.value ||
    (props.expandable && !!props.task.has_incomplete_prerequisites),
);

function toggleExpand() {
  if (!hasDetail.value) return;
  expanded.value = !expanded.value;
}
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
