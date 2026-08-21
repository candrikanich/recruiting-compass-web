<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-6"
  >
    <h2 class="text-xl font-bold mb-6 text-slate-900">
      🎯 School Status Overview
    </h2>

    <!-- Status Summary -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      <div
        v-for="status in statusCounts"
        :key="status.status"
        class="text-center p-4 rounded-lg border border-slate-200"
      >
        <p class="text-2xl mb-1">{{ getStatusEmoji(status.status) }}</p>
        <p class="text-xs text-slate-600">
          {{ getSchoolStatusLabel(status.status) }}
        </p>
        <p class="text-2xl font-bold mt-1 text-slate-900">{{ status.count }}</p>
      </div>
    </div>

    <!-- School List by Status -->
    <div class="space-y-4">
      <div
        v-for="status in schoolsByStatus"
        :key="status.status"
        class="pt-4 border-t border-slate-200"
      >
        <h3 class="font-semibold mb-3 flex items-center gap-2 text-slate-900">
          <span>{{ getStatusEmoji(status.status) }}</span>
          <span>{{ getSchoolStatusLabel(status.status) }}</span>
          <span class="text-xs font-normal text-slate-600"
            >({{ status.schools.length }})</span
          >
        </h3>

        <div v-if="status.schools.length === 0" class="text-sm text-slate-600">
          No schools
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NuxtLink
            v-for="school in status.schools"
            :key="school.id"
            :to="`/schools/${school.id}`"
            class="p-3 rounded-lg transition group border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <p class="font-semibold text-slate-900">{{ school.name }}</p>
                <p class="text-xs mt-1 text-slate-600">{{ school.location }}</p>
              </div>
              <span v-if="school.is_favorite" class="text-lg">⭐</span>
            </div>
            <div v-if="school.division" class="text-xs mt-2 text-slate-600">
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
