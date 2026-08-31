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

        <div class="mb-3 flex flex-wrap gap-1.5">
          <span
            v-if="fitBadges(school).locationLabel"
            class="inline-flex items-center rounded-full bg-brand-slate-100 px-2 py-0.5 text-xs font-medium text-brand-slate-700"
          >
            {{ fitBadges(school).locationLabel }}
          </span>
          <span
            v-if="fitBadges(school).academicLabel"
            class="inline-flex items-center rounded-full bg-brand-slate-100 px-2 py-0.5 text-xs font-medium text-brand-slate-700"
          >
            {{ fitBadges(school).academicLabel }}
          </span>
          <NuxtLink
            v-if="fitBadges(school).academicPrompt"
            to="/settings/player-details?tab=academics"
            class="inline-flex items-center rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue-700 hover:bg-brand-blue-100"
          >
            {{ fitBadges(school).academicPrompt }}
          </NuxtLink>
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

const props = withDefaults(
  defineProps<{
    items: SchoolRecommendation[];
    loading?: boolean;
    error?: string | null;
    addingKey?: string | null;
    homeState?: string | null;
    userGpa?: number | null;
  }>(),
  {
    loading: false,
    error: null,
    addingKey: null,
    homeState: null,
    userGpa: null,
  },
);

defineEmits<{
  add: [school: SchoolRecommendation];
  dismiss: [school: SchoolRecommendation];
}>();

// Rough division-average GPA defaults when no Scorecard enrichment is available.
const DIVISION_AVG_GPA: Record<string, number> = {
  D1: 3.4,
  D2: 3.1,
  D3: 3.0,
};

function fitBadges(school: SchoolRecommendation): {
  locationLabel: string | null;
  academicLabel: string | null;
  academicPrompt: string | null;
} {
  const locationLabel = !props.homeState
    ? null
    : school.state === props.homeState
      ? "In-state"
      : school.state
        ? "Out of state"
        : null;

  if (!props.userGpa) {
    return {
      locationLabel,
      academicLabel: null,
      academicPrompt: "Add your GPA to see academic fit →",
    };
  }

  const schoolAvgGpa = DIVISION_AVG_GPA[school.division] ?? null;
  const academicLabel = !schoolAvgGpa
    ? null
    : Math.abs(props.userGpa - schoolAvgGpa) <= 0.3
      ? "Academic match"
      : props.userGpa > schoolAvgGpa
        ? "Academic safety"
        : "Academic reach";

  return { locationLabel, academicLabel, academicPrompt: null };
}
</script>
