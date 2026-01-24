<template>
  <div v-if="suggestions.length > 0" class="mb-6">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-slate-900">Action Items</h2>
      <p class="text-slate-600 text-sm mt-1">
        {{ suggestions.length }} item{{
          suggestions.length !== 1 ? "s" : ""
        }}
        need{{ suggestions.length !== 1 ? "" : "s" }} your attention
      </p>
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
    <div class="space-y-3">
      <SuggestionCard
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        :suggestion="suggestion"
        @dismiss="handleDismiss(suggestion.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Suggestion } from "~/types/timeline";

interface Props {
  suggestions: Suggestion[];
  isViewingAsParent?: boolean;
  athleteName?: string;
}

withDefaults(defineProps<Props>(), {
  isViewingAsParent: false,
  athleteName: undefined,
});

const emit = defineEmits<{
  dismiss: [id: string];
}>();

const handleDismiss = (id: string) => {
  emit("dismiss", id);
};
</script>
