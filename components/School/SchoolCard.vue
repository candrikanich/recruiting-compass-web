<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="`Open profile for ${school.name}`"
    class="school-card cursor-pointer rounded-lg bg-white p-4 shadow-md transition hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    @click="navigate"
    @keydown.enter="navigate"
    @keydown.space.prevent="navigate"
  >
    <div class="flex items-start gap-4">
      <!-- School Logo -->
      <SchoolLogo :school="school" size="lg" class="shrink-0" />

      <!-- School Info -->
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-lg font-semibold text-slate-900">
          {{ school.name }}
        </h3>

        <!-- Location -->
        <div v-if="school.location" class="mt-1 text-sm text-slate-600">
          📍 {{ school.location }}
        </div>

        <!-- Division Badge -->
        <div
          v-if="school.division || calculatedSize"
          class="mt-2 flex flex-wrap items-center gap-2"
        >
          <span
            v-if="school.division"
            class="inline-block rounded-sm bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
          >
            {{ school.division }}
          </span>
          <span
            v-if="calculatedSize"
            class="inline-block rounded-sm px-2 py-1 text-xs font-medium"
            :class="sizeColorClass"
          >
            {{ calculatedSize }}
          </span>
          <span
            v-if="school.conference"
            class="inline-block rounded-sm bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
          >
            {{ school.conference }}
          </span>
        </div>

        <!-- Stats -->
        <div
          v-if="stats"
          class="mt-3 flex items-center gap-4 border-t border-slate-200 pt-3 text-sm text-slate-600"
        >
          <div>
            <span class="font-semibold text-slate-900">{{
              stats.coaches
            }}</span>
            <span class="text-slate-600"> coaches</span>
          </div>
          <div>
            <span class="font-semibold text-slate-900">{{
              stats.interactions
            }}</span>
            <span class="text-slate-600"> interactions</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2">
        <button
          v-if="isFavorite"
          class="text-xl transition hover:scale-110"
          title="Remove from favorites"
          aria-label="Remove from favorites"
          @click.stop="toggleFavorite"
          @keydown.enter.stop
          @keydown.space.stop
        >
          <span aria-hidden="true">⭐</span>
        </button>
        <button
          v-else
          class="text-xl opacity-50 transition hover:scale-110 hover:opacity-100"
          title="Add to favorites"
          aria-label="Add to favorites"
          @click.stop="toggleFavorite"
          @keydown.enter.stop
          @keydown.space.stop
        >
          <span aria-hidden="true">☆</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SchoolLogo from "./SchoolLogo.vue";
import { getCarnegieSize, getSizeColorClass } from "~/utils/schoolSize";
import type { School } from "~/types/models";

interface Props {
  school: School;
  stats?: {
    coaches: number;
    interactions: number;
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [];
  toggle: [];
}>();

const isFavorite = computed(() => props.school.is_favorite === true);

// School size support
const calculatedSize = computed(() => {
  const studentSize = props.school.academic_info?.student_size;
  return getCarnegieSize(typeof studentSize === "number" ? studentSize : null);
});

const sizeColorClass = computed(() => getSizeColorClass(calculatedSize.value));

const navigate = () => {
  emit("click");
};

const toggleFavorite = () => {
  emit("toggle");
};
</script>

<style scoped>
.school-card {
  transition: all 0.2s ease;
}

.school-card:hover {
  transform: translateY(-2px);
}
</style>
