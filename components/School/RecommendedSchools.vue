<template>
  <section
    data-testid="recommended-schools"
    aria-labelledby="recommended-schools-heading"
  >
    <h4
      id="recommended-schools-heading"
      class="mb-1 text-base font-semibold text-brand-slate-900"
    >
      Schools to consider
    </h4>
    <p class="mb-6 text-sm text-brand-slate-600">
      Suggested from your home state and academics. Add a school in one tap, or
      dismiss anything that is not a fit.
    </p>

    <div
      v-if="loading"
      class="py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        class="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent"
        aria-hidden="true"
      />
      <p class="text-sm text-brand-slate-600">Finding schools for you...</p>
    </div>

    <p
      v-else-if="error"
      role="alert"
      class="rounded-lg border border-brand-red-200 bg-brand-red-50 px-4 py-3 text-sm text-brand-red-700"
    >
      {{ error }}
    </p>

    <ul
      v-else-if="items.length > 0"
      class="grid grid-cols-1 gap-4 text-left md:grid-cols-2 lg:grid-cols-3"
    >
      <li
        v-for="school in items"
        :key="school.catalogKey"
        class="flex flex-col rounded-xl border border-brand-slate-200 bg-white p-4 shadow-xs"
      >
        <div class="mb-3 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-brand-slate-900">
              {{ school.name }}
            </p>
            <p
              v-if="school.state || school.conference"
              class="text-sm text-brand-slate-600"
            >
              <span v-if="school.state">{{ school.state }}</span>
              <span v-if="school.state && school.conference"> · </span>
              <span v-if="school.conference">{{ school.conference }}</span>
            </p>
          </div>
          <DesignSystemBadge v-if="school.division" color="blue" size="sm">
            {{ school.division }}
          </DesignSystemBadge>
        </div>

        <ul v-if="school.reasons.length" class="mb-4 list-none space-y-1">
          <li
            v-for="reason in school.reasons"
            :key="reason"
            class="text-xs text-brand-slate-600"
          >
            {{ reason }}
          </li>
        </ul>

        <div class="mt-auto flex flex-wrap gap-2">
          <DesignSystemButton
            color="blue"
            variant="solid"
            size="sm"
            :loading="addingKey === school.catalogKey"
            :aria-label="`Add ${school.name} to your list`"
            @click="$emit('add', school)"
          >
            Add to list
          </DesignSystemButton>
          <DesignSystemButton
            color="slate"
            variant="ghost"
            size="sm"
            :disabled="addingKey === school.catalogKey"
            :aria-label="`Dismiss ${school.name}`"
            @click="$emit('dismiss', school)"
          >
            Not a fit
          </DesignSystemButton>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

withDefaults(
  defineProps<{
    items: SchoolRecommendation[];
    loading?: boolean;
    error?: string | null;
    addingKey?: string | null;
  }>(),
  {
    loading: false,
    error: null,
    addingKey: null,
  },
);

defineEmits<{
  add: [school: SchoolRecommendation];
  dismiss: [school: SchoolRecommendation];
}>();
</script>
