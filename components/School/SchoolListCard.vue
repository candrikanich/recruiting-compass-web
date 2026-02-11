<template>
  <div
    class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col h-full"
  >
    <div class="p-5 flex-1 flex flex-col">
      <div class="flex items-start gap-4 mb-4">
        <SchoolLogo
          :school="school"
          size="lg"
          fetch-on-mount
          class="shadow-md rounded-lg"
        />

        <div class="flex-1 min-w-0">
          <h3 class="text-slate-900 font-semibold line-clamp-2 mb-1">
            {{ school.name }}
          </h3>
          <p class="text-slate-600 text-sm">{{ school.location }}</p>
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
            'flex-shrink-0 transition-all',
            school.is_favorite
              ? 'text-yellow-500'
              : 'text-slate-300 hover:text-yellow-400',
          ]"
        >
          <StarIcon
            :class="['w-5 h-5', school.is_favorite ? 'fill-yellow-500' : '']"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <span
          v-if="school.division"
          class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
        >
          {{ school.division }}
        </span>
        <span
          :class="getStatusBadgeClass(school.status)"
          class="px-2 py-0.5 text-xs font-medium rounded-full"
        >
          {{ formatSchoolStatus(school.status) }}
        </span>
        <span
          v-if="school.fit_score !== null && school.fit_score !== undefined"
          :class="getFitScoreBadgeClass(school.fit_score)"
          class="px-2 py-0.5 text-xs font-medium rounded-full"
        >
          Fit: {{ school.fit_score }}
        </span>
        <span
          v-if="carnegieSize"
          :class="getSizeBadgeClass(carnegieSize)"
          class="px-2 py-0.5 text-xs font-medium rounded-full"
        >
          {{ carnegieSize }}
        </span>
      </div>

      <div class="flex-1">
        <p v-if="school.conference" class="text-slate-600 text-sm mb-2">
          {{ school.conference }}
        </p>
        <p v-if="school.notes" class="text-slate-600 text-sm line-clamp-2">
          {{ school.notes }}
        </p>
      </div>
    </div>

    <div class="px-5 pb-5 flex gap-2 mt-auto">
      <NuxtLink
        :to="`/schools/${school.id}`"
        :aria-label="`View ${school.name}`"
        class="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center flex items-center justify-center gap-2"
      >
        <EyeIcon class="w-4 h-4" aria-hidden="true" />
        View
      </NuxtLink>
      <button
        @click.stop="$emit('delete', school.id)"
        :aria-label="`Delete ${school.name}`"
        class="px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
      >
        <TrashIcon class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { School } from "~/types";
import { StarIcon, EyeIcon, TrashIcon } from "@heroicons/vue/24/outline";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import { getCarnegieSize } from "~/utils/schoolSize";
import {
  getStatusBadgeClass,
  getSizeBadgeClass,
  getFitScoreBadgeClass,
  formatSchoolStatus,
} from "~/utils/schoolBadges";

const props = defineProps<{
  school: School;
}>();

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
