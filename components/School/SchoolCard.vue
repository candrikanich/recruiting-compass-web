<template>
  <div
    class="school-card rounded-lg p-4 transition cursor-pointer bg-white shadow-md hover:shadow-lg"
    @click="navigate"
  >
    <div class="flex items-start gap-4">
      <!-- School Logo -->
      <SchoolLogo :school="school" size="lg" class="shrink-0" />

      <!-- School Info -->
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold truncate text-slate-900">
          {{ school.name }}
        </h3>

        <!-- Location -->
        <div v-if="school.location" class="text-sm mt-1 text-slate-600">
          📍 {{ school.location }}
        </div>

        <!-- Division Badge -->
        <div
          v-if="school.division || calculatedSize"
          class="flex items-center gap-2 mt-2 flex-wrap"
        >
          <span
            v-if="school.division"
            class="inline-block px-2 py-1 text-xs font-medium rounded-sm bg-blue-100 text-blue-700"
          >
            {{ school.division }}
          </span>
          <span
            v-if="calculatedSize"
            class="inline-block px-2 py-1 text-xs font-medium rounded-sm"
            :class="sizeColorClass"
          >
            {{ calculatedSize }}
          </span>
          <span
            v-if="school.conference"
            class="inline-block px-2 py-1 text-xs font-medium rounded-sm bg-emerald-100 text-emerald-700"
          >
            {{ school.conference }}
          </span>
        </div>

        <!-- Stats -->
        <div
          v-if="stats"
          class="flex items-center gap-4 mt-3 pt-3 text-sm border-t border-slate-200 text-slate-600"
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
          class="text-xl hover:scale-110 transition"
          title="Remove from favorites"
          @click.stop="toggleFavorite"
        >
          ⭐
        </button>
        <button
          v-else
          class="text-xl opacity-50 hover:opacity-100 hover:scale-110 transition"
          title="Add to favorites"
          @click.stop="toggleFavorite"
        >
          ☆
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
