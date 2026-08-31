<template>
  <!-- Bare mode: row list only, no outer card/header — for embedding inside
       the Recruiting Calendar widget (single milestone-row source). -->
  <div v-if="bare" class="space-y-2">
    <div
      v-if="milestones.length === 0"
      class="py-4 text-center text-sm text-slate-500"
    >
      No upcoming milestones in the next 6 months.
    </div>

    <a
      v-for="milestone in milestones"
      :key="`${milestone.date}-${milestone.title}`"
      :href="milestone.url"
      target="_blank"
      rel="noopener"
      class="group flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-slate-100"
    >
      <div class="shrink-0">
        <div class="text-2xl">{{ getMilestoneIcon(milestone.type) }}</div>
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-slate-900 group-hover:text-slate-950">
          {{ milestone.title }}
        </div>
        <div v-if="milestone.description" class="mt-1 text-xs text-slate-600">
          {{ milestone.description }}
        </div>
      </div>
      <div class="shrink-0 text-right">
        <div class="text-xs text-slate-500">
          {{ formatDate(milestone.date) }}
        </div>
        <div
          v-if="milestone.url"
          class="mt-0.5 text-slate-400 transition group-hover:text-slate-600"
        >
          ↗
        </div>
      </div>
    </a>
  </div>

  <div
    v-else
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
  >
    <button
      type="button"
      data-testid="guidance-header"
      :aria-expanded="!collapsed"
      class="mb-4 flex w-full items-center gap-2 text-left"
      @click="$emit('toggle')"
    >
      <span class="text-2xl">📅</span>
      <h3 class="flex-1 text-lg font-bold text-slate-900">
        Upcoming Milestones
      </h3>
      <svg
        class="h-5 w-5 text-slate-400 transition-transform duration-200"
        :class="{ 'rotate-180': !collapsed }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <div v-if="!collapsed">
      <p class="mb-4 text-sm text-slate-600">
        Important dates to have on your calendar
      </p>

      <div class="space-y-2">
        <div
          v-if="milestones.length === 0"
          class="py-4 text-center text-sm text-slate-500"
        >
          No upcoming milestones in the next 6 months.
        </div>

        <a
          v-for="milestone in milestones"
          :key="`${milestone.date}-${milestone.title}`"
          :href="milestone.url"
          target="_blank"
          rel="noopener"
          class="group flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-slate-100"
        >
          <div class="shrink-0">
            <div class="text-2xl">{{ getMilestoneIcon(milestone.type) }}</div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-slate-900 group-hover:text-slate-950">
              {{ milestone.title }}
            </div>
            <div
              v-if="milestone.description"
              class="mt-1 text-xs text-slate-600"
            >
              {{ milestone.description }}
            </div>
          </div>
          <div class="shrink-0 text-right">
            <div class="text-xs text-slate-500">
              {{ formatDate(milestone.date) }}
            </div>
            <div
              v-if="milestone.url"
              class="mt-0.5 text-slate-400 transition group-hover:text-slate-600"
            >
              ↗
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Milestone } from "~/utils/ncaaRecruitingCalendar";
import { getMilestoneTypeIcon as getIcon } from "~/utils/ncaaRecruitingCalendar";

interface Props {
  milestones: Milestone[];
  collapsed?: boolean;
  /** List-only render (no card/header/subtitle) for embedding in another widget. */
  bare?: boolean;
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
  bare: false,
});

defineEmits<{
  toggle: [];
}>();

const getMilestoneIcon = (type: Milestone["type"]): string => {
  return getIcon(type);
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
</script>
