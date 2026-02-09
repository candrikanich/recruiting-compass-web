<template>
  <div
    :class="{
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4': !isParent,
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4': isParent,
    }"
  >
    <!-- Search -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1"
        >Search</label
      >
      <div class="relative">
        <MagnifyingGlassIcon
          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          :value="filterValues.get('search') || ''"
          @input="
            emits('update:filter', {
              field: 'search',
              value: ($event.target as HTMLInputElement).value,
            })
          "
          placeholder="Subject, content..."
          class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>

    <!-- Type -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Type</label>
      <select
        :value="filterValues.get('type') || ''"
        @change="
          emits('update:filter', {
            field: 'type',
            value: ($event.target as HTMLSelectElement).value || null,
          })
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <label class="block text-sm font-medium text-slate-700 mb-1"
        >Logged By</label
      >
      <select
        :value="filterValues.get('loggedBy') || ''"
        @change="
          emits('update:filter', {
            field: 'loggedBy',
            value: ($event.target as HTMLSelectElement).value || null,
          })
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- All --</option>
        <option v-if="currentUserId" :value="currentUserId">Me (Parent)</option>
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
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1"
        >Direction</label
      >
      <select
        :value="filterValues.get('direction') || ''"
        @change="
          emits('update:filter', {
            field: 'direction',
            value: ($event.target as HTMLSelectElement).value || null,
          })
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- All --</option>
        <option value="outbound">Outbound</option>
        <option value="inbound">Inbound</option>
      </select>
    </div>

    <!-- Sentiment -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1"
        >Sentiment</label
      >
      <select
        :value="filterValues.get('sentiment') || ''"
        @change="
          emits('update:filter', {
            field: 'sentiment',
            value: ($event.target as HTMLSelectElement).value || null,
          })
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <label class="block text-sm font-medium text-slate-700 mb-1"
        >Time Period</label
      >
      <select
        :value="filterValues.get('timePeriod') || ''"
        @change="
          emits('update:filter', {
            field: 'timePeriod',
            value: ($event.target as HTMLSelectElement).value || null,
          })
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- All Time --</option>
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
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
