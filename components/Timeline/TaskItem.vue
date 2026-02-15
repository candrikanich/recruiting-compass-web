<template>
  <div
    :data-task-id="task.id"
    class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition"
  >
    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="isCompleted"
      :disabled="isViewingAsParent.value || isLocked"
      @change="$emit('toggle-complete', task.id)"
      :class="[
        'mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 flex-shrink-0 transition',
        isViewingAsParent.value || isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer',
      ]"
      :title="
        isViewingAsParent.value
          ? 'Parents can view tasks but cannot mark them complete'
          : isLocked
            ? 'Complete prerequisites to unlock this task'
            : 'Mark task complete'
      "
    />

    <!-- Task content -->
    <div class="flex-1 min-w-0">
      <!-- Title and status indicator -->
      <div class="flex items-start gap-2">
        <div
          class="text-sm font-medium transition-colors flex-1"
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
          class="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 flex-shrink-0"
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
          class="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 flex-shrink-0"
        >
          Recovery
        </span>

        <!-- Expand button -->
        <button
          v-if="expandable"
          @click="expanded = !expanded"
          class="p-1 hover:bg-slate-200 rounded transition flex-shrink-0"
          :title="expanded ? 'Collapse details' : 'Expand details'"
        >
          <svg
            :class="{ 'rotate-180': expanded }"
            class="w-4 h-4 text-slate-400 transition-transform"
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
        </button>
      </div>

      <!-- Description -->
      <div v-if="task.description" class="text-slate-600 text-sm mt-1">
        {{ task.description }}
      </div>

      <!-- Badges row -->
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <!-- Category badge -->
        <span
          v-if="showCategory"
          class="inline-block px-2 py-1 text-xs rounded-full"
          :class="getCategoryColor(task.category)"
        >
          {{ formatCategory(task.category) }}
        </span>

        <!-- Required indicator -->
        <span
          v-if="task.required"
          class="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-700"
        >
          Required
        </span>

        <!-- Status badge -->
        <StatusIndicator
          v-if="showStatus && task.athlete_task"
          :status="task.athlete_task.status"
          size="sm"
          :show-label="true"
        />

        <!-- Incomplete dependencies indicator -->
        <span
          v-if="task.has_incomplete_prerequisites"
          class="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700"
        >
          ⚠ Prerequisites pending
        </span>
      </div>

      <!-- Expandable details section -->
      <Transition name="slide-fade">
        <div
          v-if="expanded"
          class="mt-3 pt-3 border-t border-slate-100 space-y-3"
        >
          <!-- Why it matters -->
          <div
            v-if="task.why_it_matters"
            class="bg-blue-50 border-l-2 border-blue-200 pl-3 py-2"
          >
            <div class="text-xs font-semibold text-blue-900 mb-1">
              Why It Matters
            </div>
            <div class="text-xs text-blue-800">{{ task.why_it_matters }}</div>
          </div>

          <!-- Failure risk -->
          <div
            v-if="task.failure_risk"
            class="bg-red-50 border-l-2 border-red-200 pl-3 py-2"
          >
            <div class="text-xs font-semibold text-red-900 mb-1">
              What Can Go Wrong
            </div>
            <div class="text-xs text-red-800">{{ task.failure_risk }}</div>
          </div>

          <!-- Dependency warning -->
          <DependencyWarning
            v-if="task.has_incomplete_prerequisites"
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
import { ref, computed } from "vue";
import { getCategoryColor, formatCategory } from "~/utils/taskHelpers";
import type { TaskWithStatus } from "~/types/timeline";
import StatusIndicator from "~/components/Timeline/StatusIndicator.vue";
import DependencyWarning from "~/components/Timeline/DependencyWarning.vue";
import DeadlineBadge from "~/components/Timeline/DeadlineBadge.vue";
import { useParentContext } from "~/composables/useParentContext";

interface Props {
  task: TaskWithStatus;
  expandable?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  isLocked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  expandable: true,
  showCategory: true,
  showStatus: true,
  isLocked: false,
});

defineEmits<{
  "toggle-complete": [taskId: string];
  "complete-prerequisite": [taskId: string];
  "continue-anyway": [];
}>();

const expanded = ref(false);
const parentContext = useParentContext();

const isCompleted = computed(
  () => props.task.athlete_task?.status === "completed",
);
const isViewingAsParent = computed(() => parentContext.isViewingAsParent);
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
