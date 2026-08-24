<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="flex items-start gap-4">
      <SchoolLogo
        :school="school"
        size="lg"
        fetch-on-mount
        :transition-name="`school-logo-${school.id}`"
      />
      <div class="min-w-0 flex-1">
        <h1 class="mb-1 text-2xl font-bold text-slate-900">
          {{ school.name }}
        </h1>
        <div
          v-if="displayLocation"
          class="mb-3 flex items-center gap-2 text-slate-600"
        >
          <UIcon
            name="i-heroicons-map-pin"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ displayLocation }}
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-if="school.division"
            class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
          >
            {{ school.division }}
          </span>
          <span
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="getSchoolStatusBadgeClass(school.status)"
          >
            {{ getSchoolStatusLabel(school.status) }}
          </span>
          <span
            v-if="calculatedSize"
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="getSizeColorClass(calculatedSize)"
          >
            {{ calculatedSize }}
          </span>
          <span
            v-if="school.conference"
            class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
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
        class="shrink-0 rounded-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :class="
          school.is_favorite
            ? 'text-yellow-500'
            : 'text-slate-300 hover:text-yellow-400'
        "
      >
        <UIcon
          name="i-heroicons-star"
          class="h-6 w-6"
          :class="school.is_favorite ? 'fill-yellow-500' : ''"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { School } from "~/types/models";
import {
  getSchoolStatusLabel,
  getSchoolStatusBadgeClass,
} from "~/utils/schoolStatusOptions";
import { getSizeColorClass } from "~/utils/schoolSize";
import SchoolLogo from "~/components/School/SchoolLogo.vue";

const props = defineProps<{
  school: School;
  calculatedSize: string | null;
}>();

defineEmits<{
  "toggle-favorite": [];
}>();

const trimmed = (value?: string | null): string | null => {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
};

// Complete campus address ("401 College Avenue, Ashland, OH") assembled from
// college data, falling back to the school's own city/state where the lookup is sparse.
const fullCampusAddress = computed<string | null>(() => {
  const info = props.school.academic_info;
  const street = trimmed(info?.address);
  const city = trimmed(info?.city ?? props.school.city);
  const state = trimmed(info?.state ?? props.school.state);
  const cityState = [city, state].filter(Boolean).join(", ");
  const parts = [street, cityState || null].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
});

const displayLocation = computed<string | null>(() => {
  if (fullCampusAddress.value) return fullCampusAddress.value;
  if (props.school.location) return props.school.location;
  const cityState = [props.school.city, props.school.state].filter(Boolean);
  if (cityState.length > 0) return cityState.join(", ");
  return trimmed(props.school.state);
});
</script>
