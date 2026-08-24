<template>
  <fieldset>
    <legend class="sr-only">Filter interactions</legend>
    <div
      :class="{
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5': !isParent,
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6': isParent,
      }"
    >
      <!-- Search -->
      <div>
        <label
          for="filter-search"
          class="mb-1 block text-sm font-medium text-slate-700"
          >Search</label
        >
        <div class="relative">
          <UIcon
            name="i-heroicons-magnifying-glass"
            aria-hidden="true"
            class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            id="filter-search"
            type="text"
            :value="filterValues.get('search') || ''"
            @input="
              emits('update:filter', {
                field: 'search',
                value: ($event.target as HTMLInputElement).value,
              })
            "
            placeholder="Subject, content..."
            class="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
          />
        </div>
      </div>

      <!-- Type -->
      <div>
        <label
          for="filter-type"
          class="mb-1 block text-sm font-medium text-slate-700"
          >Type</label
        >
        <select
          id="filter-type"
          :value="filterValues.get('type') || ''"
          @change="
            emits('update:filter', {
              field: 'type',
              value: ($event.target as HTMLSelectElement).value || null,
            })
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <option value="">-- All --</option>
          <option value="email">Email</option>
          <option value="text">Text</option>
          <option value="phone_call">Phone Call</option>
          <option value="in_person_visit">In-Person Visit</option>
          <option value="virtual_meeting">Virtual Meeting</option>
          <option value="camp">Camp</option>
          <option value="showcase">Showcase</option>
          <option value="tweet">Tweet</option>
          <option value="dm">Direct Message</option>
        </select>
      </div>

      <!-- Logged By (Parents only) -->
      <div v-if="isParent">
        <label
          for="filter-logged-by"
          class="mb-1 block text-sm font-medium text-slate-700"
          >Logged By</label
        >
        <select
          id="filter-logged-by"
          :value="filterValues.get('loggedBy') || ''"
          @change="
            emits('update:filter', {
              field: 'loggedBy',
              value: ($event.target as HTMLSelectElement).value || null,
            })
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <option value="">-- All --</option>
          <option v-if="currentUserId" :value="currentUserId">
            Me (Parent)
          </option>
          <option
            v-for="athlete in linkedAthletes"
            :key="athlete.id"
            :value="athlete.id"
          >
            {{ athlete.full_name }}
          </option>
        </select>
      </div>

      <!-- Direction -->
      <DesignSystemFormSegmentedControl
        label="Direction"
        size="sm"
        :model-value="filterValues.get('direction') || ''"
        :options="[
          { value: '', label: 'All' },
          { value: 'outbound', label: 'Outbound' },
          { value: 'inbound', label: 'Inbound' },
        ]"
        @update:model-value="
          emits('update:filter', { field: 'direction', value: $event || null })
        "
      />

      <!-- Sentiment -->
      <div>
        <label
          for="filter-sentiment"
          class="mb-1 block text-sm font-medium text-slate-700"
          >Sentiment</label
        >
        <select
          id="filter-sentiment"
          :value="filterValues.get('sentiment') || ''"
          @change="
            emits('update:filter', {
              field: 'sentiment',
              value: ($event.target as HTMLSelectElement).value || null,
            })
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <option value="">-- All --</option>
          <option value="very_positive">Very Positive</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      <!-- Time Period -->
      <div>
        <label
          for="filter-time-period"
          class="mb-1 block text-sm font-medium text-slate-700"
          >Time Period</label
        >
        <select
          id="filter-time-period"
          :value="filterValues.get('timePeriod') || ''"
          @change="
            emits('update:filter', {
              field: 'timePeriod',
              value: ($event.target as HTMLSelectElement).value || null,
            })
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <option value="">-- All Time --</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { User } from "~/types/models";

interface Props {
  filterValues: Map<string, string | null>;
  isParent: boolean;
  linkedAthletes: User[];
  currentUserId?: string;
}

withDefaults(defineProps<Props>(), {
  currentUserId: undefined,
});

const emits = defineEmits<{
  "update:filter": [{ field: string; value: string | null }];
}>();
</script>
