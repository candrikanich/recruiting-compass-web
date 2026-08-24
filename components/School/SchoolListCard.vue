<template>
  <div
    data-testid="school-card"
    class="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="flex flex-1 flex-col p-5">
      <div class="mb-4 flex items-start gap-4">
        <SchoolLogo
          :school="school"
          size="lg"
          fetch-on-mount
          class="rounded-lg shadow-md"
          :transition-name="`school-logo-${school.id}`"
        />

        <div class="min-w-0 flex-1">
          <h3 class="mb-1 line-clamp-2 font-semibold text-slate-900">
            {{ school.name }}
          </h3>
          <p class="text-sm text-slate-600">{{ school.location }}</p>
        </div>

        <button
          @click.stop="$emit('toggle-favorite', school.id, school.is_favorite)"
          :aria-label="
            school.is_favorite
              ? `Remove ${school.name} from favorites`
              : `Add ${school.name} to favorites`
          "
          :aria-pressed="school.is_favorite"
          :class="[
            'shrink-0 transition-all',
            school.is_favorite
              ? 'text-yellow-500'
              : 'text-slate-300 hover:text-yellow-400',
          ]"
        >
          <UIcon
            name="i-heroicons-star"
            :class="['h-5 w-5', school.is_favorite ? 'fill-yellow-500' : '']"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="mb-4 flex flex-wrap gap-2">
        <span
          v-if="school.division"
          class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
        >
          {{ school.division }}
        </span>
        <span
          :class="getSchoolStatusBadgeClass(school.status)"
          class="rounded-full px-2 py-0.5 text-xs font-medium"
        >
          {{ getSchoolStatusLabel(school.status) }}
        </span>
        <span
          v-if="overall"
          :class="fitPillClass"
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :aria-label="`Personal fit: ${fitPillLabel}`"
        >
          {{ fitPillLabel }}
        </span>
        <span
          v-if="carnegieSize"
          :class="getSizeBadgeClass(carnegieSize)"
          class="rounded-full px-2 py-0.5 text-xs font-medium"
        >
          {{ carnegieSize }}
        </span>
      </div>

      <div class="flex-1">
        <p v-if="school.conference" class="mb-2 text-sm text-slate-600">
          {{ school.conference }}
        </p>
        <p v-if="school.notes" class="line-clamp-2 text-sm text-slate-600">
          {{ school.notes }}
        </p>
      </div>
    </div>

    <div class="mt-auto flex gap-2 px-5 pb-5">
      <NuxtLink
        :to="`/schools/${school.id}`"
        :aria-label="`View ${school.name}`"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
      >
        <UIcon name="i-heroicons-eye" class="h-4 w-4" aria-hidden="true" />
        View
      </NuxtLink>
      <button
        @click.stop="$emit('delete', school.id)"
        :aria-label="`Delete ${school.name}`"
        class="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <UIcon name="i-heroicons-trash" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { School } from "~/types";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import { getCarnegieSize } from "~/utils/schoolSize";
import { getSizeBadgeClass } from "~/utils/schoolBadges";
import {
  getSchoolStatusBadgeClass,
  getSchoolStatusLabel,
} from "~/utils/schoolStatusOptions";
import type { OverallPersonalFit } from "~/utils/fitScoreCalculation";

const props = defineProps<{
  school: School;
  overall?: OverallPersonalFit | null;
}>();

const FIT_PILL: Record<OverallPersonalFit, { label: string; class: string }> = {
  strong: { label: "Strong fit", class: "bg-emerald-100 text-emerald-700" },
  good: { label: "Good fit", class: "bg-orange-100 text-orange-700" },
  stretch: { label: "Stretch", class: "bg-red-100 text-red-700" },
};

const fitPillLabel = computed(() =>
  props.overall ? FIT_PILL[props.overall].label : "",
);
const fitPillClass = computed(() =>
  props.overall ? FIT_PILL[props.overall].class : "",
);

defineEmits<{
  "toggle-favorite": [id: string, isFavorite: boolean];
  delete: [id: string];
}>();

const carnegieSize = computed(() => {
  const studentSize = props.school.academic_info?.student_size;
  const numericSize =
    typeof studentSize === "string"
      ? parseInt(studentSize)
      : typeof studentSize === "number"
        ? studentSize
        : null;
  return getCarnegieSize(numericSize);
});
</script>
