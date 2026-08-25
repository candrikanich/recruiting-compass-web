<!-- components/profile/public/TeamHistoryPanel.vue -->
<script setup lang="ts">
import type { PublicTeamHistoryEntry } from "~/types/models";

defineProps<{ entries: PublicTeamHistoryEntry[] | null }>();
</script>

<template>
  <section v-if="entries?.length">
    <h2 class="mb-3 text-sm font-semibold text-brand-slate-900">
      Team History
    </h2>
    <DSCard padding="md">
      <ul class="divide-y divide-brand-slate-100">
        <li
          v-for="(entry, idx) in entries"
          :key="`${entry.name}-${idx}`"
          class="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-brand-slate-900">
              {{ entry.name }}
            </p>
            <p class="text-xs text-brand-slate-500">
              <span v-if="entry.level">{{ entry.level }}</span>
              <span v-if="entry.level && entry.coach"> · </span>
              <span v-if="entry.coach">Coach {{ entry.coach }}</span>
            </p>
          </div>
          <span
            v-if="entry.years"
            class="shrink-0 text-xs font-medium text-brand-slate-500"
          >
            {{ entry.years }}
          </span>
        </li>
      </ul>
    </DSCard>
  </section>
</template>
