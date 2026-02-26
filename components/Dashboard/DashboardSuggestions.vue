<template>
  <div v-if="suggestions.length > 0 || deadPeriodMessage" class="mb-6">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-slate-900">Action Items</h2>
      <p class="text-slate-600 text-sm mt-1">
        {{
          deadPeriodMessage && suggestions.length === 0
            ? "No action items at this time"
            : suggestions.length +
              " item" +
              (suggestions.length !== 1 ? "s" : "") +
              " need" +
              (suggestions.length !== 1 ? "" : "s") +
              " your attention"
        }}
      </p>
    </div>

    <!-- Dead Period Notice -->
    <div
      v-if="deadPeriodMessage"
      class="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0">
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
      class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
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
      class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center"
    >
      <p class="text-sm text-blue-700 mb-2">
        <span class="font-semibold">{{ moreCount }}</span>
        {{ moreCount === 1 ? "reminder" : "reminders" }} pending
      </p>
      <button
        @click="surfaceMoreSuggestions"
        :disabled="surfacingMore"
        class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
import { useSchools } from "~/composables/useSchools";
import { getDeadPeriodMessage } from "~/server/utils/ncaaRecruitingCalendar";

interface Props {
  suggestions: Suggestion[];
  isViewingAsParent?: boolean;
  athleteName?: string;
  moreCount?: number;
}

withDefaults(defineProps<Props>(), {
  isViewingAsParent: false,
  athleteName: undefined,
  moreCount: 0,
});

const emit = defineEmits<{
  dismiss: [id: string];
}>();

const suggestionsComposable = useSuggestions();
const { schools: allSchools } = useSchools();
const surfacingMore = ref(false);

const deadPeriodMessage = computed(() => {
  if (allSchools.value.length === 0) return null;

  const now = new Date();

  // Check if ALL schools are in a dead period
  const schoolsInDeadPeriod = allSchools.value.filter((school) => {
    const division = (school.division as string) || "D1";
    return getDeadPeriodMessage(now, division as "D1" | "D2" | "D3");
  });

  if (schoolsInDeadPeriod.length === allSchools.value.length) {
    return getDeadPeriodMessage(now, "D1");
  }

  return null;
});

const moreCount = computed(() => suggestionsComposable?.moreCount.value || 0);

const handleDismiss = (id: string) => {
  emit("dismiss", id);
};

const surfaceMoreSuggestions = async () => {
  surfacingMore.value = true;
  try {
    await suggestionsComposable?.surfaceMoreSuggestions();
  } catch (error) {
    console.error("Error surfacing more suggestions:", error);
  } finally {
    surfacingMore.value = false;
  }
};
</script>
