<template>
  <div class="bg-white border rounded-xl p-4 shadow-sm" :class="urgencyClasses">
    <div class="flex items-start gap-3">
      <!-- Urgency icon -->
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        :class="iconClasses"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-900 mb-2">
          {{ suggestion.message }}
        </p>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-if="showAction"
            @click="handleAction"
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition"
            :class="actionClasses"
          >
            {{ actionLabel }}
          </button>

          <button
            @click="showHelpModal = true"
            class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Learn more about this suggestion"
          >
            Learn More
          </button>

          <button
            @click="$emit('dismiss', suggestion.id)"
            class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Help Modal -->
  <SuggestionHelpModal
    :is-open="showHelpModal"
    :rule-type="suggestion.rule_type"
    :urgency="suggestion.urgency"
    @close="showHelpModal = false"
    @action="handleAction"
  />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Suggestion } from "~/types/timeline";

interface Props {
  suggestion: Suggestion;
  showAction?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAction: true,
});

const showHelpModal = ref(false);

defineEmits<{
  action: [suggestionId: string];
  dismiss: [suggestionId: string];
}>();

const urgencyClasses = computed(() => {
  switch (props.suggestion.urgency) {
    case "high":
      return "border-red-200 bg-red-50";
    case "medium":
      return "border-orange-200 bg-orange-50";
    case "low":
      return "border-blue-200 bg-blue-50";
    default:
      return "border-slate-200 bg-slate-50";
  }
});

const iconClasses = computed(() => {
  switch (props.suggestion.urgency) {
    case "high":
      return "bg-red-100 text-red-600";
    case "medium":
      return "bg-orange-100 text-orange-600";
    case "low":
      return "bg-blue-100 text-blue-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
});

const actionClasses = computed(() => {
  switch (props.suggestion.urgency) {
    case "high":
      return "bg-red-600 text-white hover:bg-red-700";
    case "medium":
      return "bg-orange-600 text-white hover:bg-orange-700";
    case "low":
      return "bg-blue-600 text-white hover:bg-blue-700";
    default:
      return "bg-slate-600 text-white hover:bg-slate-700";
  }
});

const actionLabel = computed(() => {
  switch (props.suggestion.action_type) {
    case "log_interaction":
      return "Log Interaction";
    case "add_video":
      return "Add Video";
    case "add_school":
      return "Add School";
    case "update_video":
      return "Update Video";
    default:
      return "Take Action";
  }
});

function handleAction() {
  switch (props.suggestion.action_type) {
    case "log_interaction":
      navigateTo(
        `/interactions/add${props.suggestion.related_school_id ? `?schoolId=${props.suggestion.related_school_id}` : ""}`,
      );
      break;
    case "add_video":
      navigateTo("/videos");
      break;
    case "add_school":
      navigateTo("/schools/new");
      break;
    case "update_video":
      navigateTo("/videos");
      break;
  }
}
</script>
