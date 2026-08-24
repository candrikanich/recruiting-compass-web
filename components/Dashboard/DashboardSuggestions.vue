<template>
  <div v-if="suggestions.length > 0 || deadPeriodMessage" class="mb-6">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-slate-900">Action Items</h2>
      <p class="mt-1 text-sm text-slate-600">
        {{
          deadPeriodMessage && suggestions.length === 0
            ? "No action items at this time"
            : actionItemsText
        }}
      </p>
    </div>

    <!-- Dead Period Notice -->
    <div
      v-if="deadPeriodMessage"
      class="mb-4 rounded-r border-l-4 border-amber-400 bg-amber-50 p-4"
    >
      <div class="flex items-start">
        <div class="shrink-0">
          <svg
            class="h-5 w-5 text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-amber-700">{{ deadPeriodMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Parent Notice -->
    <div
      v-if="isViewingAsParent"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <p class="text-sm text-amber-800">
        💡 These suggestions are for
        <strong>{{ athleteName || "your athlete" }}</strong
        >. Consider discussing them together.
      </p>
    </div>

    <!-- Suggestions List -->
    <div v-if="suggestions.length > 0" class="space-y-3">
      <SuggestionCard
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        :suggestion="suggestion"
        @dismiss="handleDismiss(suggestion.id)"
      />
    </div>

    <!-- Pending Reminders Indicator -->
    <div
      v-if="moreCount > 0"
      class="mt-4 rounded-sm border border-blue-200 bg-blue-50 p-3 text-center"
    >
      <p class="mb-2 text-sm text-blue-700">
        <span class="font-semibold">{{ moreCount }}</span>
        {{ moreCount === 1 ? "reminder" : "reminders" }} pending
      </p>
      <button
        @click="surfaceMoreSuggestions"
        :disabled="surfacingMore"
        class="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ surfacingMore ? "Loading..." : "Show more" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Suggestion } from "~/types/timeline";
import { useSuggestions } from "~/composables/useSuggestions";
import { createClientLogger } from "~/utils/logger";

interface Props {
  suggestions: Suggestion[];
  isViewingAsParent?: boolean;
  athleteName?: string;
  moreCount?: number;
  deadPeriodMessage?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  isViewingAsParent: false,
  athleteName: undefined,
  moreCount: 0,
  deadPeriodMessage: null,
});

const emit = defineEmits<{
  dismiss: [id: string];
}>();

const logger = createClientLogger("DashboardSuggestions");
const suggestionsComposable = useSuggestions();
const surfacingMore = ref(false);

const actionItemsText = computed(() => {
  const n = props.suggestions.length;
  return `${n} item${n !== 1 ? "s" : ""} need${n === 1 ? "s" : ""} your attention`;
});

const handleDismiss = (id: string) => {
  emit("dismiss", id);
};

const surfaceMoreSuggestions = async () => {
  surfacingMore.value = true;
  try {
    await suggestionsComposable?.surfaceMoreSuggestions();
  } catch (error) {
    logger.error("Error surfacing more suggestions", error);
  } finally {
    surfacingMore.value = false;
  }
};
</script>
