<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <h2 class="mb-6 text-xl font-bold text-slate-900">
      🎯 School Status Overview
    </h2>

    <!-- Status Summary -->
    <div class="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <div
        v-for="status in statusCounts"
        :key="status.status"
        class="rounded-lg border border-slate-200 p-4 text-center"
      >
        <p class="mb-1 text-2xl">{{ getStatusEmoji(status.status) }}</p>
        <p class="text-xs text-slate-600">
          {{ getSchoolStatusLabel(status.status) }}
        </p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ status.count }}</p>
      </div>
    </div>

    <!-- School List by Status -->
    <div class="space-y-4">
      <div
        v-for="status in schoolsByStatus"
        :key="status.status"
        class="border-t border-slate-200 pt-4"
      >
        <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <span>{{ getStatusEmoji(status.status) }}</span>
          <span>{{ getSchoolStatusLabel(status.status) }}</span>
          <span class="text-xs font-normal text-slate-600"
            >({{ status.schools.length }})</span
          >
        </h3>

        <div v-if="status.schools.length === 0" class="text-sm text-slate-600">
          No schools
        </div>

        <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <NuxtLink
            v-for="school in status.schools"
            :key="school.id"
            :to="`/schools/${school.id}`"
            class="group rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <p class="font-semibold text-slate-900">{{ school.name }}</p>
                <p class="mt-1 text-xs text-slate-600">{{ school.location }}</p>
              </div>
              <span v-if="school.is_favorite" class="text-lg">⭐</span>
            </div>
            <div v-if="school.division" class="mt-2 text-xs text-slate-600">
              {{ school.division }} • {{ school.conference }}
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { School } from "~/types/models";
import {
  SCHOOL_STATUS_OPTIONS,
  getSchoolStatusLabel,
} from "~/utils/schoolStatusOptions";

interface Props {
  schools: School[];
}

const props = defineProps<Props>();

const CANONICAL_STATUSES = SCHOOL_STATUS_OPTIONS.map((option) => option.value);

const statusCounts = computed(() =>
  CANONICAL_STATUSES.map((status) => ({
    status,
    count: props.schools.filter((s) => s.status === status).length,
  })),
);

const schoolsByStatus = computed(() =>
  CANONICAL_STATUSES.map((status) => ({
    status,
    schools: props.schools.filter((s) => s.status === status),
  })),
);

const getStatusEmoji = (status: string): string => {
  const emojis: Record<string, string> = {
    researching: "🔍",
    contacted: "📞",
    visiting: "🏫",
    offer_received: "🎉",
    committed: "✅",
    not_pursuing: "🚫",
  };
  return emojis[status] || "📌";
};
</script>
