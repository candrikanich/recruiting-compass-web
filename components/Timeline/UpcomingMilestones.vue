<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📅</span>
      <h3 class="text-lg font-bold text-slate-900">Upcoming Milestones</h3>
    </div>

    <p class="text-sm text-slate-600 mb-4">
      Important dates to have on your calendar
    </p>

    <div class="space-y-2">
      <div
        v-if="milestones.length === 0"
        class="text-sm text-slate-500 py-4 text-center"
      >
        No upcoming milestones in the next 6 months.
      </div>

      <a
        v-for="milestone in milestones"
        :key="`${milestone.date}-${milestone.title}`"
        :href="milestone.url"
        target="_blank"
        rel="noopener"
        class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition group cursor-pointer border border-slate-200 hover:border-slate-300"
      >
        <div class="flex-shrink-0">
          <div class="text-2xl">{{ getMilestoneIcon(milestone.type) }}</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-slate-900 group-hover:text-slate-950">
            {{ milestone.title }}
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            {{ formatDate(milestone.date) }}
          </div>
          <div v-if="milestone.description" class="text-xs text-slate-600 mt-1">
            {{ milestone.description }}
          </div>
        </div>
        <div
          v-if="milestone.url"
          class="flex-shrink-0 text-slate-400 group-hover:text-slate-600 transition"
        >
          ↗
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Milestone } from "~/server/utils/ncaaRecruitingCalendar";
import { getMilestoneTypeIcon as getIcon } from "~/server/utils/ncaaRecruitingCalendar";

interface Props {
  milestones: Milestone[];
}

defineProps<Props>();

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
