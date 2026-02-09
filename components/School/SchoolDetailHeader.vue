<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-start gap-4">
      <SchoolLogo :school="school" size="lg" fetch-on-mount />
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold text-slate-900 mb-1">
          {{ school.name }}
        </h1>
        <div class="flex items-center gap-2 text-slate-600 mb-3">
          <MapPinIcon class="w-4 h-4" />
          {{ school.location }}
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-if="school.division"
            class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
          >
            {{ school.division }}
          </span>
          <label for="school-status" class="sr-only">School status</label>
          <select
            id="school-status"
            :model-value="school.status"
            @change="handleStatusChange"
            :disabled="statusUpdating"
            class="px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500"
            :class="[
              getStatusBadgeColor(school.status),
              statusUpdating ? 'opacity-50' : '',
            ]"
          >
            <option value="researching">Researching</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="offer_received">Offer Received</option>
            <option value="committed">Committed</option>
          </select>
          <div class="py-1">
            <SchoolPrioritySelector
              :model-value="school.priority_tier ?? null"
              @update:model-value="handlePriorityUpdate"
              :data-testid="`priority-selector-${school.id}`"
            />
          </div>
          <span
            v-if="calculatedSize"
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="getSizeColorClass(calculatedSize)"
          >
            {{ calculatedSize }}
          </span>
          <span
            v-if="school.conference"
            class="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700"
          >
            {{ school.conference }}
          </span>
        </div>
      </div>
      <button
        @click="$emit('toggle-favorite')"
        :aria-label="
          school.is_favorite ? 'Remove from favorites' : 'Add to favorites'
        "
        :aria-pressed="school.is_favorite"
        class="flex-shrink-0 transition-all"
        :class="
          school.is_favorite
            ? 'text-yellow-500'
            : 'text-slate-300 hover:text-yellow-400'
        "
      >
        <StarIcon
          class="w-6 h-6"
          :class="school.is_favorite ? 'fill-yellow-500' : ''"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { School } from "~/types/models";
import { getStatusBadgeColor } from "~/utils/schoolStatusBadges";
import { getSizeColorClass } from "~/utils/schoolSize";
import { MapPinIcon, StarIcon } from "@heroicons/vue/24/outline";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import SchoolPrioritySelector from "~/components/SchoolPrioritySelector.vue";

const props = defineProps<{
  school: School;
  calculatedSize: string | null;
  statusUpdating: boolean;
}>();

const emit = defineEmits<{
  "update:status": [status: string];
  "update:priority": [tier: "A" | "B" | "C" | null];
  "toggle-favorite": [];
}>();

const handleStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:status", target.value);
};

const handlePriorityUpdate = (tier: "A" | "B" | "C" | null) => {
  emit("update:priority", tier);
};
</script>
