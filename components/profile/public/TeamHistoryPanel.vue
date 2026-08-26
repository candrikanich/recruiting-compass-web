<!-- components/profile/public/TeamHistoryPanel.vue -->
<script setup lang="ts">
import type { PublicTeamHistoryEntry } from "~/types/models";
import SectionHeader from "~/components/profile/public/SectionHeader.vue";

defineProps<{ entries: PublicTeamHistoryEntry[] | null }>();
</script>

<template>
  <section v-if="entries?.length">
    <SectionHeader
      icon="i-heroicons-clock"
      title="Team History & Coaching References"
    />
    <DesignSystemCard padding="md">
      <ul class="divide-y divide-brand-slate-100">
        <li
          v-for="(entry, idx) in entries"
          :key="`${entry.name}-${idx}`"
          class="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-brand-slate-900">
                {{ entry.name }}
              </p>
              <DesignSystemBadge v-if="entry.level" color="slate" variant="light">
                {{ entry.level }}
              </DesignSystemBadge>
            </div>
            <p v-if="entry.coach || entry.contact" class="mt-1 text-xs text-brand-slate-500">
              <span v-if="entry.coach">Coach: {{ entry.coach }}</span>
              <span v-if="entry.coach && entry.contact"> — </span>
              <span v-if="entry.contact">Reference Contact: {{ entry.contact }}</span>
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
    </DesignSystemCard>
  </section>
</template>
